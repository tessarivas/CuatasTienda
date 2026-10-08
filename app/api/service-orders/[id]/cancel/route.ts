import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";
import {
  requireUser,
  isUnsyncedUserError,
  unsyncedUserResponse,
} from "@/lib/auth/require-user";
import { ORDER_SELECT, isValidMethod, orderMoney } from "@/lib/services/orders";

type Ctx = { params: Promise<{ id: string }> };

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// POST /api/service-orders/[id]/cancel  { deposit?: "devolver" | "quedar", refundMethod? }
// El cliente ya no vino: el pedido "Por entregar" pasa a "Cancelado".
// Si tiene anticipo se pregunta cada vez (decidido con la tienda):
// - "devolver": se registra una devolución por todo lo pagado, con
//   refundMethod; sale de la caja ese día.
// - "quedar": la tienda se queda con el anticipo; ese dinero ya contó en el
//   corte del día en que se recibió.
// Un pedido ya pagado completo no se cancela: su venta ya contó para el
// corte del proveedor.
export async function POST(req: Request, { params }: Ctx) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  const { user: sessionUser, response } = await requireUser();
  if (response) return response;

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // Sin cuerpo: sólo vale si no hay anticipo.
  }
  const input = body as { deposit?: unknown; refundMethod?: unknown };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const money = await orderMoney(tx, id);
      if (!money) return { error: "Pedido no encontrado" as const, status: 404 };
      if (money.status !== "PorEntregar") {
        return {
          error:
            money.status === "Entregado"
              ? ("Este pedido ya se entregó." as const)
              : ("Este pedido ya estaba cancelado." as const),
          status: 409,
        };
      }
      if (money.saleId !== null) {
        return {
          error: "Este pedido ya está pagado completo y no se puede cancelar." as const,
          status: 409,
        };
      }
      if (money.paidCents > 0) {
        if (input.deposit !== "devolver" && input.deposit !== "quedar") {
          return { error: "Elige qué pasa con el anticipo" as const, status: 400 };
        }
        if (input.deposit === "devolver") {
          if (!isValidMethod(input.refundMethod)) {
            return { error: "Elige cómo se devuelve el anticipo" as const, status: 400 };
          }
          await tx.serviceOrderPayment.create({
            data: {
              orderId: id,
              amount: (money.paidCents / 100).toFixed(2),
              method: input.refundMethod,
              kind: "Devolucion",
              receivedBy: sessionUser.id,
            },
          });
        }
      }
      const { count } = await tx.serviceOrder.updateMany({
        where: { id, status: "PorEntregar" },
        data: { status: "Cancelado", cancelledAt: new Date() },
      });
      if (count === 0) {
        return { error: "Este pedido ya cambió; recarga la página." as const, status: 409 };
      }
      const order = await tx.serviceOrder.findUnique({ where: { id }, select: ORDER_SELECT });
      return { error: null, order };
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result.order);
  } catch (err) {
    if (isUnsyncedUserError(err)) return unsyncedUserResponse();
    console.error("POST cancelar pedido de servicio falló", err);
    return NextResponse.json({ error: "No se pudo cancelar el pedido" }, { status: 500 });
  }
}
