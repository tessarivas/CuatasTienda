import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { supabaseServerClient } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

function parseId(raw: string | number) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// POST /api/clients/[id]/layaway/liquidate
// Payload: { itemIds: number[] }. Uno o varios LayawayItem ids del apartado
// activo del cliente.
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
//   5. Eliminar los LayawayItem liquidados.
//   6. Si ya no quedan items en el Layaway, pasarlo a status="Liquidado".
//   7. Restar el total del currentBalance del cliente.
export async function POST(req: Request, { params }: Ctx) {
  const { id: rawClientId } = await params;
  const clientId = parseId(rawClientId);
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

  try {
    const result = await prisma.$transaction(async (tx) => {
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

      const total = items.reduce(
        (acc, item) => acc.plus(item.price),
        new Prisma.Decimal(0)
      );
      if (client.currentBalance.lessThan(total)) {
        return {
          error: "El saldo del cliente no alcanza para liquidar" as const,
          status: 409,
          faltante: total.minus(client.currentBalance).toFixed(2),
        };
      }

      const sale = await tx.sale.create({
        data: {
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

      for (const item of items) {
        const currentQty = item.Product.quantity ?? 1;
        const newQty = Math.max(0, currentQty - 1);
        // Sólo levanta la bandera "Vendido" cuando el SKU queda sin stock.
        // Si aún quedan unidades, status se deja intacto (sigue "Disponible");
        // esto evita pisar un producto que pudo haber sido soft-deleted.
        const data: {
          quantity: number;
          soldCount: { increment: number };
          status?: "Vendido";
        } = {
          quantity: newQty,
          soldCount: { increment: 1 },
        };
        if (newQty === 0) data.status = "Vendido";
        await tx.product.update({
          where: { id: item.productId },
          data,
        });
      }

      await tx.layawayItem.deleteMany({ where: { id: { in: itemIds } } });

      const remaining = await tx.layawayItem.count({
        where: { layawayId },
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
      };
    });

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
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2003"
    ) {
      return NextResponse.json(
        {
          error:
            "Tu usuario aún no está sincronizado. Vuelve a iniciar sesión e intenta de nuevo.",
        },
        { status: 409 }
      );
    }
    console.error("POST liquidate falló", err);
    return NextResponse.json(
      { error: "No se pudo liquidar el apartado" },
      { status: 500 }
    );
  }
}
