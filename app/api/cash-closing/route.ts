import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import {
  requireUser,
  isUnsyncedUserError,
  unsyncedUserResponse,
} from "@/lib/auth/require-user";
import { storeDayRange, storeDateString } from "@/lib/store-time";

const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;
const MAX_MONEY = 100_000_000;

// "YYYY-MM-DD" → valor para la columna @db.Date (medianoche UTC de ese día).
const toDbDate = (date: string) => new Date(`${date}T00:00:00.000Z`);

const closingInclude = { User: { select: { name: true } } } as const;

// Cobros de una ventana [from, to): ventas de caja (con método de pago) y
// abonos de clientes. Las liquidaciones de apartados no entran: no traen
// dinero nuevo, ese dinero entró antes como abono.
async function collect(from: Date, to: Date) {
  const [sales, payments] = await Promise.all([
    prisma.sale.findMany({
      where: { date: { gte: from, lt: to }, paymentMethod: { not: null } },
      orderBy: { date: "asc" },
      select: {
        id: true,
        folio: true,
        date: true,
        total: true,
        paymentMethod: true,
        receiptUrl: true,
      },
    }),
    prisma.payment.findMany({
      where: { date: { gte: from, lt: to } },
      orderBy: { date: "asc" },
      select: {
        id: true,
        date: true,
        amount: true,
        method: true,
        receiptUrl: true,
        Client: { select: { id: true, name: true } },
      },
    }),
  ]);

  const zero = new Prisma.Decimal(0);
  let cashSales = zero;
  let cashPayments = zero;
  let bankTotal = zero;
  for (const s of sales) {
    if (s.paymentMethod === "Efectivo") cashSales = cashSales.plus(s.total);
    else bankTotal = bankTotal.plus(s.total);
  }
  for (const p of payments) {
    if (p.method === "Efectivo") cashPayments = cashPayments.plus(p.amount);
    else bankTotal = bankTotal.plus(p.amount);
  }
  return { sales, payments, cashSales, cashPayments, bankTotal };
}

// Dónde empieza el corte abierto: donde terminó el último corte. Si nunca
// se ha cerrado uno, desde el primer cobro registrado (venta de caja o
// abono) — empezar "hoy" dejaría fuera de todo corte lo cobrado antes del
// primer cierre. Sin cobros, al inicio del día de hoy. Si se olvidó cerrar
// algún día, sus cobros quedan en este corte (no se pierden).
async function openPeriodStart(today: string) {
  const last = await prisma.cashClosing.findFirst({
    orderBy: { periodEnd: "desc" },
    select: { periodEnd: true },
  });
  if (last) return last.periodEnd;

  const [firstSale, firstPayment] = await Promise.all([
    prisma.sale.findFirst({
      where: { paymentMethod: { not: null } },
      orderBy: { date: "asc" },
      select: { date: true },
    }),
    prisma.payment.findFirst({
      orderBy: { date: "asc" },
      select: { date: true },
    }),
  ]);
  const firsts = [firstSale?.date, firstPayment?.date].filter(
    (d): d is Date => !!d
  );
  return firsts.length
    ? new Date(Math.min(...firsts.map((d) => d.getTime())))
    : storeDayRange(today)!.from;
}

// GET /api/cash-closing?date=YYYY-MM-DD (por defecto, hoy en la tienda)
//   - Día con corte: sus cobros en la ventana guardada [periodStart, periodEnd).
//   - Hoy sin corte: el corte abierto, desde el último cierre hasta ahora.
//   - Día pasado sin corte: closing null y sin cobros (sus cobros quedaron en
//     el siguiente corte que se cerró).
// `lateCount`: cobros hechos después de este cierre (si es el último corte);
// entran al corte siguiente.
export async function GET(req: Request) {
  const today = storeDateString();
  const date = new URL(req.url).searchParams.get("date") ?? today;
  if (!storeDayRange(date)) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }

  try {
    const closing = await prisma.cashClosing.findUnique({
      where: { date: toDbDate(date) },
      include: closingInclude,
    });

    let periodStart: Date | null = null;
    let periodEnd: Date | null = null;
    if (closing) {
      periodStart = closing.periodStart;
      periodEnd = closing.periodEnd;
    } else if (date === today) {
      periodStart = await openPeriodStart(today);
      periodEnd = new Date();
    }

    const day = periodStart && periodEnd ? await collect(periodStart, periodEnd) : null;

    let lateCount = 0;
    if (closing) {
      const isLatest = !(await prisma.cashClosing.findFirst({
        where: { periodEnd: { gt: closing.periodEnd } },
        select: { id: true },
      }));
      if (isLatest) {
        const late = await collect(closing.periodEnd, new Date());
        lateCount = late.sales.length + late.payments.length;
      }
    }

    return NextResponse.json({
      date,
      isToday: date === today,
      periodStart,
      periodEnd: closing ? periodEnd : null,
      sales: day?.sales ?? [],
      payments: day?.payments ?? [],
      summary: {
        cashSales: (day?.cashSales ?? new Prisma.Decimal(0)).toFixed(2),
        cashPayments: (day?.cashPayments ?? new Prisma.Decimal(0)).toFixed(2),
        bankTotal: (day?.bankTotal ?? new Prisma.Decimal(0)).toFixed(2),
      },
      closing,
      lateCount,
    });
  } catch (err) {
    console.error("GET corte de caja falló", err);
    return NextResponse.json(
      { error: "No se pudo cargar el corte de caja" },
      { status: 500 }
    );
  }
}

// PUT /api/cash-closing — { date, openingCash, countedCash, notes? }
//   - Hoy sin corte: lo cierra. Ventana = [inicio del corte abierto, ahora).
//   - Día con corte: lo corrige (es de admin). La ventana no se mueve; se
//     recalcula el resumen dentro de ella.
//   - Día pasado sin corte: no se puede cerrar (sus cobros ya están en otro).
// closedBy es quien lo cerró la primera vez (de la sesión).
export async function PUT(req: Request) {
  const { user: sessionUser, response } = await requireUser();
  if (response) return response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const input = body as {
    date?: unknown;
    openingCash?: unknown;
    countedCash?: unknown;
    notes?: unknown;
  };

  const date = typeof input.date === "string" ? input.date : "";
  if (!storeDayRange(date)) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }

  const parseMoney = (value: unknown) => {
    const text = typeof value === "number" ? String(value) : value;
    if (typeof text !== "string" || !MONEY_PATTERN.test(text.trim())) return null;
    const n = Number(text);
    return n <= MAX_MONEY ? new Prisma.Decimal(n.toFixed(2)) : null;
  };
  const openingCash = parseMoney(input.openingCash);
  const countedCash = parseMoney(input.countedCash);
  if (!openingCash || !countedCash) {
    return NextResponse.json(
      { error: "El fondo inicial y el efectivo contado deben ser montos válidos" },
      { status: 400 }
    );
  }
  let notes: string | null = null;
  if (input.notes !== undefined && input.notes !== null) {
    if (typeof input.notes !== "string") {
      return NextResponse.json({ error: "Notas inválidas" }, { status: 400 });
    }
    notes = input.notes.trim().slice(0, 1000) || null;
  }

  // Lo que se guarda en ambos casos: resumen de la ventana + conteo. El
  // esperado es sólo la caja principal; los abonos en efectivo van a la
  // caja de apartados.
  const summarize = async (from: Date, to: Date) => {
    const day = await collect(from, to);
    const expectedCash = openingCash.plus(day.cashSales);
    return {
      openingCash,
      cashSales: day.cashSales,
      cashPayments: day.cashPayments,
      bankTotal: day.bankTotal,
      expectedCash,
      countedCash,
      difference: countedCash.minus(expectedCash),
      notes,
    };
  };

  try {
    const existing = await prisma.cashClosing.findUnique({
      where: { date: toDbDate(date) },
    });

    if (existing) {
      const data = await summarize(existing.periodStart, existing.periodEnd);
      const closing = await prisma.cashClosing.update({
        where: { id: existing.id },
        data,
        include: closingInclude,
      });
      return NextResponse.json(closing);
    }

    const today = storeDateString();
    if (date !== today) {
      return NextResponse.json(
        { error: "Sólo se puede cerrar el corte de hoy" },
        { status: 400 }
      );
    }
    const periodStart = await openPeriodStart(today);
    const periodEnd = new Date();
    const data = await summarize(periodStart, periodEnd);
    const closing = await prisma.cashClosing.create({
      data: {
        date: toDbDate(date),
        periodStart,
        periodEnd,
        closedAt: periodEnd,
        closedBy: sessionUser.id,
        ...data,
      },
      include: closingInclude,
    });
    return NextResponse.json(closing, { status: 201 });
  } catch (err) {
    if (isUnsyncedUserError(err)) return unsyncedUserResponse();
    // Dos personas cerrando el mismo día a la vez: el índice único de date
    // rechaza la segunda.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "El corte de hoy ya se cerró; recarga la página" },
        { status: 409 }
      );
    }
    console.error("PUT corte de caja falló", err);
    return NextResponse.json(
      { error: "No se pudo guardar el corte de caja" },
      { status: 500 }
    );
  }
}
