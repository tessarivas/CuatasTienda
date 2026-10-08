import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";
import {
  requireUser,
  isUnsyncedUserError,
  unsyncedUserResponse,
} from "@/lib/auth/require-user";
import { isFolioCollision, FOLIO_RETRIES } from "@/lib/sales/folio";
import { SALE_ROW_SELECT } from "@/lib/sales/select";
import { ORDER_SELECT, addOrderPayment, isValidMethod, orderMoney } from "@/lib/services/orders";

type Ctx = { params: Promise<{ id: string }> };

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// POST /api/service-orders/[id]/deliver  { paymentMethod? }
// "Entregar y cobrar": el cliente recoge. Si resta algo por pagar, se cobra
// en este momento (paymentMethod obligatorio) como el último pago del
// pedido; con eso queda pagado completo y se crea la venta (ver
// addOrderPayment). Si ya estaba pagado completo con anticipos, sólo se
// marca como entregado. Quién cobra sale de la sesión.
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
    // Sin cuerpo: sólo vale si ya estaba pagado completo.
  }
  const paymentMethod = (body as { paymentMethod?: unknown }).paymentMethod;

  const run = () =>
    prisma.$transaction(async (tx) => {
      const money = await orderMoney(tx, id);
      if (!money) return { error: "Pedido no encontrado" as const, status: 404 };
      if (money.status !== "PorEntregar") {
        return {
          error:
            money.status === "Entregado"
              ? ("Este pedido ya se entregó." as const)
              : ("Este pedido está cancelado." as const),
          status: 409,
        };
      }
      if (money.restCents > 0) {
        if (!isValidMethod(paymentMethod)) {
          return { error: "Elige cómo pagó el cliente" as const, status: 400 };
        }
        await addOrderPayment(tx, {
          orderId: id,
          amountCents: money.restCents,
          method: paymentMethod,
          userId: sessionUser.id,
        });
      }

      // Con el estado en el where: si otro lo canceló o entregó al mismo
      // tiempo, se deshace todo (incluido el último pago y la venta).
      const { count } = await tx.serviceOrder.updateMany({
        where: { id, status: "PorEntregar" },
        data: { status: "Entregado", deliveredAt: new Date() },
      });
      if (count === 0) throw new AlreadyResolvedError();

      const order = await tx.serviceOrder.findUnique({ where: { id }, select: ORDER_SELECT });
      const sale = order?.Sale
        ? await tx.sale.findUnique({ where: { id: order.Sale.id }, select: SALE_ROW_SELECT })
        : null;
      return { error: null, order, sale };
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
    return NextResponse.json({ order: result.order, sale: result.sale });
  } catch (err) {
    if (err instanceof AlreadyResolvedError) {
      return NextResponse.json({ error: "Este pedido ya se entregó o se canceló." }, { status: 409 });
    }
    if (isUnsyncedUserError(err)) return unsyncedUserResponse();
    console.error("POST entregar pedido de servicio falló", err);
    return NextResponse.json({ error: "No se pudo entregar el pedido" }, { status: 500 });
  }
}

// Lanzada dentro de la transacción para deshacerla si el pedido cambió de
// estado entre la lectura y la actualización.
class AlreadyResolvedError extends Error {}
