import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";
import { Prisma, PaymentMethod } from "@/generated/prisma/client";
import { nextFolio, isFolioCollision, FOLIO_RETRIES } from "@/lib/sales/folio";
import {
  requireUser,
  isUnsyncedUserError,
  unsyncedUserResponse,
} from "@/lib/auth/require-user";

type Ctx = { params: Promise<{ id: string }> };

function parseId(raw: string | number) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const VALID_METHODS: ReadonlyArray<PaymentMethod> = [
  PaymentMethod.Efectivo,
  PaymentMethod.Tarjeta,
  PaymentMethod.Transferencia,
];

// POST /api/clients/[id]/layaway/liquidate
// Payload: { itemIds: number[], payShortfall?: { method } }. Uno o varios
// LayawayItem ids del apartado activo del cliente.
//
// `payShortfall` es para "Liquidar Cuenta": si el saldo no alcanza, antes de
// liquidar se registra un Payment por exactamente lo que falta (lo calcula el
// servidor, no se confía en un monto del cliente), dentro de la misma
// transacción. Así nunca queda un abono suelto si la liquidación falla, ni
// una liquidación a medias si el abono falla. Sin `payShortfall`, un saldo
// insuficiente sigue siendo 409 como siempre.
//
// Flujo transaccional (todo-o-nada):
//   1. Verificar que todos los items existen, pertenecen al Layaway activo
//      de este cliente.
//   2. Sumar los precios snapshoteados de los items; rechazar si el saldo
//      del cliente no alcanza.
//   3. Crear Sale(total, clientId, userId=sesión) + SaleItem[] (finalPrice
//      copiado del LayawayItem — no del Product, para respetar el precio
//      pactado al momento del apartado).
//   4. Para cada producto: status="Vendido" si la cantidad resultante es 0,
//      si no "Disponible"; quantity = max(0, quantity-1); soldCount += 1.
//   5. Marcar los LayawayItem como status="Liquidado", ligados a la venta.
//      No se borran: son los renglones "+ apartado" del historial del
//      cliente (la lista en papel).
//   6. Si ya no quedan items Activos en el Layaway, pasarlo a
//      status="Liquidado".
//   7. Restar el total del currentBalance del cliente.
export async function POST(req: Request, { params }: Ctx) {
  const { id: rawClientId } = await params;
  const clientId = parseId(rawClientId);
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

  const rawItemIds = (body as { itemIds?: unknown }).itemIds;
  if (!Array.isArray(rawItemIds) || rawItemIds.length === 0) {
    return NextResponse.json(
      { error: "Debes indicar al menos un item a liquidar" },
      { status: 400 }
    );
  }
  const itemIds: number[] = [];
  for (const raw of rawItemIds) {
    const parsed = parseId(raw as string | number);
    if (parsed === null) {
      return NextResponse.json(
        { error: "Item inválido en la lista" },
        { status: 400 }
      );
    }
    itemIds.push(parsed);
  }

  const rawPayShortfall = (body as { payShortfall?: unknown }).payShortfall;
  let shortfallMethod: PaymentMethod | null = null;
  if (rawPayShortfall !== undefined) {
    const method = (rawPayShortfall as { method?: unknown } | null)?.method;
    if (!(VALID_METHODS as readonly unknown[]).includes(method)) {
      return NextResponse.json(
        { error: "Método de pago inválido" },
        { status: 400 }
      );
    }
    shortfallMethod = method as PaymentMethod;
  }

  try {
    const run = () => prisma.$transaction(async (tx) => {
      const client = await tx.client.findUnique({
        where: { id: clientId },
        select: { id: true, currentBalance: true },
      });
      if (!client) {
        return { error: "Cliente no encontrado" as const, status: 404 };
      }

      const items = await tx.layawayItem.findMany({
        where: { id: { in: itemIds } },
        include: {
          Layaway: { select: { id: true, clientId: true, status: true } },
          Product: { select: { id: true, quantity: true, soldCount: true } },
        },
      });

      if (items.length !== itemIds.length) {
        return {
          error: "Alguno de los items no existe" as const,
          status: 404,
        };
      }

      const layawayIds = new Set(items.map((i) => i.Layaway.id));
      if (layawayIds.size !== 1) {
        return {
          error:
            "Todos los items deben pertenecer al mismo apartado" as const,
          status: 400,
        };
      }
      const [layawayId] = [...layawayIds];
      const layaway = items[0].Layaway;
      if (layaway.clientId !== clientId) {
        return {
          error: "El apartado no pertenece al cliente" as const,
          status: 403,
        };
      }
      if (layaway.status !== "Activo") {
        return {
          error: "El apartado ya no está activo" as const,
          status: 409,
        };
      }
      // Un item ya liquidado o cancelado sigue existiendo (historial); sin
      // este chequeo se podría cobrar dos veces el mismo producto.
      if (items.some((i) => i.status !== "Activo")) {
        return {
          error: "Alguno de los productos ya no está apartado" as const,
          status: 409,
        };
      }

      const total = items.reduce(
        (acc, item) => acc.plus(item.price),
        new Prisma.Decimal(0)
      );

      // Abono por lo que falta, sólo si se pidió y de verdad falta.
      let shortfallPayment = null;
      if (shortfallMethod && client.currentBalance.lessThan(total)) {
        const shortfall = total.minus(client.currentBalance);
        shortfallPayment = await tx.payment.create({
          data: {
            clientId,
            amount: shortfall,
            method: shortfallMethod,
            receivedBy: sessionUser.id,
          },
        });
        const withPayment = await tx.client.update({
          where: { id: clientId },
          data: { currentBalance: { increment: shortfall } },
          select: { id: true, currentBalance: true },
        });
        client.currentBalance = withPayment.currentBalance;
      }

      if (client.currentBalance.lessThan(total)) {
        return {
          error: "El saldo del cliente no alcanza para liquidar" as const,
          status: 409,
          faltante: total.minus(client.currentBalance).toFixed(2),
        };
      }

      const sale = await tx.sale.create({
        data: {
          // Mismo consecutivo del día que las ventas de caja.
          folio: await nextFolio(tx),
          total,
          clientId,
          userId: sessionUser.id,
          SaleItem: {
            create: items.map((item) => ({
              productId: item.productId,
              finalPrice: item.price,
            })),
          },
        },
        include: { SaleItem: true },
      });

      // Unidades a descontar por producto. Agrupado porque varios items
      // pueden ser del mismo producto (2 plumas apartadas): restar 1 por item
      // a partir de la cantidad leída al inicio dejaba el stock en 39 en vez
      // de 38 — cada item partía del mismo valor viejo.
      const unitsByProduct = new Map<number, number>();
      for (const item of items) {
        unitsByProduct.set(
          item.productId,
          (unitsByProduct.get(item.productId) ?? 0) + 1
        );
      }
      for (const [productId, units] of unitsByProduct) {
        const product = items.find((i) => i.productId === productId)!.Product;
        const currentQty = product.quantity ?? units;
        const newQty = Math.max(0, currentQty - units);
        // Sólo levanta la bandera "Vendido" cuando el SKU queda sin stock.
        // Si aún quedan unidades, status se deja intacto (sigue "Disponible");
        // esto evita pisar un producto que pudo haber sido soft-deleted.
        const data: {
          quantity: number;
          soldCount: { increment: number };
          status?: "Vendido";
        } = {
          quantity: newQty,
          soldCount: { increment: units },
        };
        if (newQty === 0) data.status = "Vendido";
        await tx.product.update({
          where: { id: productId },
          data,
        });
      }

      await tx.layawayItem.updateMany({
        where: { id: { in: itemIds } },
        data: { status: "Liquidado", resolvedAt: new Date(), saleId: sale.id },
      });

      const remaining = await tx.layawayItem.count({
        where: { layawayId, status: "Activo" },
      });
      let updatedLayaway;
      if (remaining === 0) {
        updatedLayaway = await tx.layaway.update({
          where: { id: layawayId },
          data: { status: "Liquidado" },
        });
      } else {
        updatedLayaway = await tx.layaway.findUnique({
          where: { id: layawayId },
        });
      }

      const updatedClient = await tx.client.update({
        where: { id: clientId },
        data: { currentBalance: { decrement: total } },
      });

      return {
        error: null,
        sale,
        client: updatedClient,
        layaway: updatedLayaway,
        payment: shortfallPayment,
      };
    });

    // Si otra venta tomó el mismo folio al mismo tiempo, la transacción
    // entera se deshace (P2002) y se reintenta con el siguiente número.
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
      return NextResponse.json(
        {
          error: result.error,
          ...(result.error === "El saldo del cliente no alcanza para liquidar" &&
          "faltante" in result
            ? { faltante: result.faltante }
            : {}),
        },
        { status: result.status }
      );
    }

    return NextResponse.json({
      sale: result.sale,
      client: result.client,
      layaway: result.layaway,
      payment: result.payment,
    });
  } catch (err) {
    if (isUnsyncedUserError(err)) {
      return unsyncedUserResponse();
    }
    console.error("POST liquidate falló", err);
    return NextResponse.json(
      { error: "No se pudo liquidar el apartado" },
      { status: 500 }
    );
  }
}
