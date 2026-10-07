import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";
import { PaymentMethod } from "@/generated/prisma/client";
import {
  requireUser,
  isUnsyncedUserError,
  unsyncedUserResponse,
} from "@/lib/auth/require-user";

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

// POST /api/clients/[id]/refund  { amount, method }
// Devolución de saldo a favor (#36): la tienda le regresa al cliente dinero
// que abonó y que ya no cubre ningún apartado. Se registra como un Payment
// con kind = "Devolucion" (monto positivo) y baja Client.currentBalance, en
// la misma transacción, para que el historial siga cuadrando contra el saldo.
//
// Sólo se puede devolver lo que sobra: saldo − total de apartados activos.
// Lo que cubre apartados vigentes no se devuelve (habría que cancelar esos
// apartados primero). En efectivo, sale de la caja de apartados en el corte.
// receivedBy (quién la hizo) sale de la sesión, nunca del body.
export async function POST(req: Request, { params }: Ctx) {
  const { id: rawId } = await params;
  const clientId = parseId(rawId);
  if (clientId === null) {
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
  const amountStr =
    typeof input.amount === "string" || typeof input.amount === "number"
      ? String(input.amount).trim()
      : "";
  if (!MONEY_PATTERN.test(amountStr) || Number(amountStr) <= 0) {
    return NextResponse.json(
      { error: "El monto debe ser mayor a 0, con hasta dos decimales" },
      { status: 400 }
    );
  }
  if (!isValidMethod(input.method)) {
    return NextResponse.json({ error: "Método de pago inválido" }, { status: 400 });
  }
  const amountCents = Math.round(Number(amountStr) * 100);
  const method = input.method;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const client = await tx.client.findUnique({
        where: { id: clientId },
        select: { currentBalance: true },
      });
      if (!client) {
        return { error: "Cliente no encontrado" as const, status: 404 };
      }

      const reserved = await tx.layawayItem.findMany({
        where: { status: "Activo", Layaway: { clientId, status: "Activo" } },
        select: { price: true },
      });
      const reservedCents = reserved.reduce(
        (sum, r) => sum + Math.round(Number(r.price) * 100),
        0
      );
      const surplusCents =
        Math.round(Number(client.currentBalance) * 100) - reservedCents;
      if (amountCents > surplusCents) {
        return {
          error:
            surplusCents > 0
              ? (`Sólo se pueden devolver $${(surplusCents / 100).toFixed(2)}: el resto cubre sus apartados.` as const)
              : ("El cliente no tiene saldo a favor para devolver." as const),
          status: 409,
        };
      }

      const amount = (amountCents / 100).toFixed(2);
      const payment = await tx.payment.create({
        data: {
          clientId,
          amount,
          method,
          kind: "Devolucion",
          receivedBy: sessionUser.id,
        },
      });
      const updatedClient = await tx.client.update({
        where: { id: clientId },
        data: { currentBalance: { decrement: amount } },
      });
      return { error: null, payment, client: updatedClient };
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(
      { payment: result.payment, client: result.client },
      { status: 201 }
    );
  } catch (err) {
    if (isUnsyncedUserError(err)) {
      return unsyncedUserResponse();
    }
    console.error("POST devolución de saldo falló", err);
    return NextResponse.json(
      { error: "No se pudo registrar la devolución" },
      { status: 500 }
    );
  }
}
