import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";
import { requireUser, isUnsyncedUserError, unsyncedUserResponse } from "@/lib/auth/require-user";
import { isFolioCollision } from "@/lib/sales/folio";
import {
  ORDER_SELECT,
  checkOrderProducts,
  orderMoney,
  parseOrderBody,
  settleIfPaid,
} from "@/lib/services/orders";

type Ctx = { params: Promise<{ id: string }> };

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// PATCH /api/service-orders/[id]
// { customerName, customerPhone?, items } — edita un pedido que todavía está
// "Por entregar" (p. ej. salió otro servicio). Reemplaza la lista completa de
// servicios. El proveedor no cambia: el folio es suyo. Uno entregado o
// cancelado ya no se edita (409).
export async function PATCH(req: Request, { params }: Ctx) {
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
  const parsed = parseOrderBody(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.serviceOrder.findUnique({
        where: { id },
        select: { status: true, supplierId: true },
      });
      if (!order) return { error: "Pedido no encontrado" as const, status: 404 };
      if (order.status !== "PorEntregar") {
        return {
          error:
            order.status === "Entregado"
              ? ("Este pedido ya se entregó y cobró; ya no se puede cambiar." as const)
              : ("Este pedido está cancelado." as const),
          status: 409,
        };
      }
      const productError = await checkOrderProducts(tx, order.supplierId, parsed.items);
      if (productError) return { error: productError, status: 400 };

      // Con anticipos: ya pagado completo no se edita (su venta ya existe), y
      // el total nuevo no puede quedar abajo de lo que ya se pagó.
      const money = await orderMoney(tx, id);
      if (money?.saleId !== null && money?.saleId !== undefined) {
        return {
          error: "Este pedido ya está pagado completo; ya no se puede cambiar." as const,
          status: 409,
        };
      }
      const newTotalCents = parsed.items.reduce(
        (sum, i) => sum + Math.round(Number(i.price) * 100) * i.quantity,
        0
      );
      if (money && newTotalCents < money.paidCents) {
        return {
          error: `El total no puede quedar abajo de lo que ya pagó ($${(money.paidCents / 100).toFixed(2)}).`,
          status: 400,
        };
      }

      await tx.serviceOrderItem.deleteMany({ where: { orderId: id } });
      await tx.serviceOrder.update({
        where: { id },
        data: {
          ...parsed.customer,
          ServiceOrderItem: { create: parsed.items },
        },
      });
      // Si el total nuevo quedó igual a lo pagado, ya está pagado completo.
      await settleIfPaid(tx, id, sessionUser.id);
      const updated = await tx.serviceOrder.findUnique({ where: { id }, select: ORDER_SELECT });
      return { error: null, order: updated };
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result.order);
  } catch (err) {
    if (isFolioCollision(err)) {
      return NextResponse.json({ error: "Intenta guardar otra vez" }, { status: 409 });
    }
    if (isUnsyncedUserError(err)) return unsyncedUserResponse();
    console.error("PATCH pedido de servicio falló", err);
    return NextResponse.json(
      { error: "No se pudo guardar el pedido" },
      { status: 500 }
    );
  }
}
