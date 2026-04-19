import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";
import { Prisma, PaymentMethod } from "@/generated/prisma/client";
import { supabaseServerClient } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;

const VALID_METHODS: ReadonlyArray<PaymentMethod> = [
  PaymentMethod.Efectivo,
  PaymentMethod.Tarjeta,
  PaymentMethod.Transferencia,
];

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function isValidMethod(value: unknown): value is PaymentMethod {
  return (VALID_METHODS as readonly string[]).includes(value as string);
}

// POST /api/clients/[id]/payments
// Abono — registra un Payment y actualiza Client.currentBalance de forma atómica.
// receivedBy se toma siempre de la sesión de Supabase (no se confía en el cliente).
export async function POST(req: Request, { params }: Ctx) {
  const { id: rawId } = await params;
  const clientId = parseId(rawId);
  if (clientId === null) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const supabase = await supabaseServerClient();
  const {
    data: { user: sessionUser },
  } = await supabase.auth.getUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const input = body as { amount?: unknown; method?: unknown };

  const amountStr =
    typeof input.amount === "string" || typeof input.amount === "number"
      ? String(input.amount).trim()
      : "";
  if (!MONEY_PATTERN.test(amountStr)) {
    return NextResponse.json(
      { error: "El monto debe tener hasta dos decimales" },
      { status: 400 }
    );
  }
  if (Number(amountStr) <= 0) {
    return NextResponse.json(
      { error: "El monto debe ser mayor a 0" },
      { status: 400 }
    );
  }
  if (Number(amountStr) >= 100_000_000) {
    return NextResponse.json(
      { error: "El monto excede el máximo permitido" },
      { status: 400 }
    );
  }
  const amount = Number(amountStr).toFixed(2);

  if (!isValidMethod(input.method)) {
    return NextResponse.json(
      { error: "Método de pago inválido" },
      { status: 400 }
    );
  }
  const method = input.method;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const client = await tx.client.findUnique({
        where: { id: clientId },
        select: { id: true },
      });
      if (!client) return { notFound: true as const };

      const payment = await tx.payment.create({
        data: {
          clientId,
          amount,
          method,
          receivedBy: sessionUser.id,
        },
      });
      const updatedClient = await tx.client.update({
        where: { id: clientId },
        data: { currentBalance: { increment: amount } },
      });
      return { notFound: false as const, payment, client: updatedClient };
    });

    if (result.notFound) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { payment: result.payment, client: result.client },
      { status: 201 }
    );
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2003"
    ) {
      // Usuario firmado no existe en la tabla User (primer login aún no sincroniza).
      return NextResponse.json(
        {
          error:
            "Tu usuario aún no está sincronizado. Vuelve a iniciar sesión e intenta de nuevo.",
        },
        { status: 409 }
      );
    }
    console.error("POST abono falló", err);
    return NextResponse.json(
      { error: "No se pudo registrar el abono" },
      { status: 500 }
    );
  }
}
