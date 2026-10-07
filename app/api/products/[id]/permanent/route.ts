import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";
import { deleteProductImage } from "@/lib/cloudinary/product";

type Ctx = { params: Promise<{ id: string }> };

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Borrado permanente de un producto (#6), aparte del "Eliminar producto" de
// siempre (soft delete a "Retirado", reversible con /restore).
//
// Sólo se permite si el producto NO tiene historial: ni ventas (SaleItem),
// ni apartados de ningún estado (LayawayItem), ni altas/retiros
// (StockMovement). Es para lo que se dio de alta por error. Un producto con
// historial alimenta los cortes de su proveedor y el historial de
// movimientos, así que ése sólo se retira, nunca se borra. Además, sin esta
// regla el borrado chocaría con las foreign keys (no hay onDelete: Cascade).
async function historyCounts(productId: number) {
  const [sales, layaways, movements] = await Promise.all([
    prisma.saleItem.count({ where: { productId } }),
    prisma.layawayItem.count({ where: { productId } }),
    prisma.stockMovement.count({ where: { productId } }),
  ]);
  return { sales, layaways, movements };
}

const hasHistory = (c: { sales: number; layaways: number; movements: number }) =>
  c.sales > 0 || c.layaways > 0 || c.movements > 0;

// GET /api/products/[id]/permanent → { canDelete, sales, layaways, movements }
// Para que el diálogo sepa si ofrecer "Borrar para siempre".
export async function GET(_req: Request, { params }: Ctx) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  const exists = await prisma.product.findUnique({ where: { id }, select: { id: true } });
  if (!exists) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }
  const counts = await historyCounts(id);
  return NextResponse.json({ canDelete: !hasHistory(counts), ...counts });
}

// DELETE /api/products/[id]/permanent
// Vuelve a revisar el historial dentro de la transacción (pudo venderse o
// apartarse entre que se abrió el diálogo y se confirmó).
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id },
        select: { code: true, picture: true },
      });
      if (!product) {
        return { error: "Producto no encontrado" as const, status: 404 };
      }
      const [sales, layaways, movements] = await Promise.all([
        tx.saleItem.count({ where: { productId: id } }),
        tx.layawayItem.count({ where: { productId: id } }),
        tx.stockMovement.count({ where: { productId: id } }),
      ]);
      if (hasHistory({ sales, layaways, movements })) {
        return {
          error:
            "Este producto ya tiene ventas, apartados o movimientos; sólo se puede retirar." as const,
          status: 409,
        };
      }
      await tx.product.delete({ where: { id } });
      return { error: null, product };
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    // La foto vive en products/{code}/picture. Si falla el borrado en
    // Cloudinary el producto ya no existe; sólo queda una imagen huérfana.
    if (result.product.code && result.product.picture) {
      try {
        await deleteProductImage(result.product.code);
      } catch (err) {
        console.error("Borrar foto del producto en Cloudinary falló", err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE producto permanente falló", err);
    return NextResponse.json(
      { error: "No se pudo borrar el producto" },
      { status: 500 }
    );
  }
}
