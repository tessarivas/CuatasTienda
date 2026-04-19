import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// POST /api/clients/[id]/layaway/items
// Aparta un producto para el cliente. Crea el Layaway "Activo" si no existe,
// agrega un LayawayItem con el precio actual del producto (snapshot) y marca
// el producto como "Apartado". Todo en una transacción atómica.
export async function POST(req: Request, { params }: Ctx) {
  const { id: rawClientId } = await params;
  const clientId = parseId(rawClientId);
  if (clientId === null) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const productId = parseId(String((body as { productId?: unknown }).productId));
  if (productId === null) {
    return NextResponse.json(
      { error: "Producto inválido" },
      { status: 400 }
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const client = await tx.client.findUnique({
        where: { id: clientId },
        select: { id: true },
      });
      if (!client) return { error: "Cliente no encontrado" as const, status: 404 };

      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { id: true, status: true, price: true, quantity: true },
      });
      if (!product) {
        return { error: "Producto no encontrado" as const, status: 404 };
      }
      if (product.status === "Retirado" || product.status === "Vendido") {
        return {
          error:
            "Este producto ya no está disponible para apartar." as const,
          status: 409,
        };
      }

      // Verificar que queden unidades libres (quantity - reservas activas).
      const activeReservations = await tx.layawayItem.count({
        where: { productId, Layaway: { status: "Activo" } },
      });
      const available = (product.quantity ?? 0) - activeReservations;
      if (available <= 0) {
        return {
          error: "No hay unidades libres de este producto." as const,
          status: 409,
        };
      }

      // Busca o crea el Layaway activo del cliente.
      let layaway = await tx.layaway.findFirst({
        where: { clientId, status: "Activo" },
        select: { id: true },
      });
      if (!layaway) {
        layaway = await tx.layaway.create({
          data: { clientId, status: "Activo" },
          select: { id: true },
        });
      }

      const item = await tx.layawayItem.create({
        data: {
          layawayId: layaway.id,
          productId,
          price: product.price, // snapshot al momento del apartado
        },
      });
      // IMPORTANTE: no tocar Product.status. Las reservas se derivan del
      // conteo de LayawayItem activos; status queda sólo para el ciclo de
      // vida del SKU (Disponible / Vendido / Retirado).

      return { error: null, item };
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result.item, { status: 201 });
  } catch (err) {
    console.error("POST layaway item falló", err);
    return NextResponse.json(
      { error: "No se pudo apartar el producto" },
      { status: 500 }
    );
  }
}
