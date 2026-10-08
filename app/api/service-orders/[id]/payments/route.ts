import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";
import {
  requireUser,
  isUnsyncedUserError,
  unsyncedUserResponse,
} from "@/lib/auth/require-user";
import { isFolioCollision, FOLIO_RETRIES } from "@/lib/sales/folio";
import {
  ORDER_SELECT,
  addOrderPayment,
  isValidMethod,
  orderMoney,
  parseAmountCents,
} from "@/lib/services/orders";

type Ctx = { params: Promise<{ id: string }> };

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// POST /api/service-orders/[id]/payments  { amount, method }
// "Registrar anticipo": el cliente deja dinero antes de recoger (parcial o
// completo). Cuenta en el corte de caja del día (efectivo a la caja
// principal). No puede pasar de lo que resta. Si con este pago queda pagado
// completo, se crea la venta (ver addOrderPayment). Quién lo recibe sale de
// la sesión.
export async function POST(req: Request, { params }: Ctx) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  const { user: sessionUser, response } = await requireUser();
  if (response) return response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const input = body as { amount?: unknown; method?: unknown };
  const amountCents = parseAmountCents(input.amount);
  if (amountCents === null) {
    return NextResponse.json({ error: "Escribe un monto mayor a 0" }, { status: 400 });
  }
  if (!isValidMethod(input.method)) {
    return NextResponse.json({ error: "Elige cómo pagó el cliente" }, { status: 400 });
  }
  const method = input.method;

  const run = () =>
    prisma.$transaction(async (tx) => {
      const money = await orderMoney(tx, id);
      if (!money) return { error: "Pedido no encontrado" as const, status: 404 };
      if (money.status !== "PorEntregar") {
        return { error: "Este pedido ya no está por entregar." as const, status: 409 };
      }
      if (money.restCents === 0) {
        return { error: "Este pedido ya está pagado completo." as const, status: 409 };
      }
      if (amountCents > money.restCents) {
        return {
          error: `Sólo resta por pagar $${(money.restCents / 100).toFixed(2)}.`,
          status: 400,
        };
      }
      await addOrderPayment(tx, { orderId: id, amountCents, method, userId: sessionUser.id });
      const order = await tx.serviceOrder.findUnique({ where: { id }, select: ORDER_SELECT });
      return { error: null, order };
    });

  try {
    let result: Awaited<ReturnType<typeof run>>;
    for (let attempt = 1; ; attempt++) {
      try {
        result = await run();
        break;
      } catch (err) {
        if (isFolioCollision(err) && attempt < FOLIO_RETRIES) continue;
        throw err;
      }
    }
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result.order, { status: 201 });
  } catch (err) {
    if (isUnsyncedUserError(err)) return unsyncedUserResponse();
    console.error("POST anticipo de pedido falló", err);
    return NextResponse.json({ error: "No se pudo registrar el anticipo" }, { status: 500 });
  }
}
