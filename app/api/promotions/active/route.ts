import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";
import { storeDateString } from "@/lib/store-time";
import { fromDbDate, toDbDate } from "@/lib/promotions";

// GET /api/promotions/active
// Promociones vigentes HOY (día de la tienda). Un producto está en una como
// máximo (de todo su proveedor o de productos elegidos).
// La caja las usa para mostrar el precio rebajado; POST /api/sales las vuelve
// a leer por su cuenta al cobrar (no confía en lo que mande la pantalla).
export async function GET() {
  const today = toDbDate(storeDateString());
  try {
    const promotions = await prisma.supplierPromotion.findMany({
      where: { cancelledAt: null, startsOn: { lte: today }, endsOn: { gte: today } },
      select: {
        id: true,
        supplierId: true,
        name: true,
        type: true,
        value: true,
        startsOn: true,
        endsOn: true,
        allProducts: true,
        Products: { select: { productId: true } },
      },
    });
    return NextResponse.json(
      promotions.map(({ Products, ...p }) => ({
        ...p,
        productIds: Products.map((x) => x.productId),
        value: Number(p.value),
        startsOn: fromDbDate(p.startsOn),
        endsOn: fromDbDate(p.endsOn),
      }))
    );
  } catch (err) {
    console.error("GET promociones vigentes falló", err);
    return NextResponse.json({ error: "No se pudieron cargar las promociones" }, { status: 500 });
  }
}
