import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";
import { storeDayRange, storeDateString } from "@/lib/store-time";
import { cutoffPeriodFor, effectiveCutoffDay } from "@/lib/suppliers/cutoff";

type Ctx = { params: Promise<{ id: string }> };

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// GET /api/suppliers/[id]/stock-report?from=YYYY-MM-DD&to=YYYY-MM-DD
// Existencias del proveedor para su reporte PDF: qué tiene en tienda y en
// qué estado, más lo vendido en el periodo (días de la tienda, ambos
// inclusive; sin from/to, el periodo de corte en curso). Sólo lectura.
//
// Reglas (decididas con la tienda):
// - Lo que sigue en existencia sale siempre, sin importar en qué corte se
//   dio de alta.
// - Lo vendido sólo cuenta si se vendió dentro del periodo: lo de cortes
//   pasados ya se le entregó al proveedor.
// - Los productos retirados (soft-delete) también salen, con su estado.
// - Los servicios no salen (no tienen existencia).
// - Se omite un producto sin existencia y sin ventas en el periodo.
export async function GET(req: Request, { params }: Ctx) {
  const { id: rawId } = await params;
  const supplierId = parseId(rawId);
  if (supplierId === null) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    select: { cutoffDay: true, createdAt: true },
  });
  if (!supplier) {
    return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });
  }

  const cutoffDay = effectiveCutoffDay(supplier.cutoffDay, storeDateString(supplier.createdAt));
  const current = cutoffPeriodFor(cutoffDay, storeDateString());
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? current.from;
  const to = searchParams.get("to") ?? current.to;
  const fromRange = storeDayRange(from);
  const toRange = storeDayRange(to);
  if (!fromRange || !toRange || from > to) {
    return NextResponse.json({ error: "Rango de fechas inválido" }, { status: 400 });
  }

  try {
    const products = await prisma.product.findMany({
      where: { supplierId, type: "PRODUCT" },
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        code: true,
        price: true,
        status: true,
        quantity: true,
        _count: {
          select: {
            LayawayItem: { where: { status: "Activo", Layaway: { status: "Activo" } } },
          },
        },
        SaleItem: {
          where: { Sale: { date: { gte: fromRange.from, lt: toRange.to } } },
          select: { quantity: true, finalPrice: true, discount: true },
        },
      },
    });

    const rows = products
      .map((p) => {
        const quantity = p.quantity ?? 0;
        const reserved = p._count.LayawayItem;
        const available = Math.max(0, quantity - reserved);
        const soldUnits = p.SaleItem.reduce((sum, i) => sum + i.quantity, 0);
        const soldCents = p.SaleItem.reduce(
          (sum, i) =>
            sum + Math.round(Number(i.finalPrice) * 100) * i.quantity - Math.round(Number(i.discount) * 100),
          0
        );
        const status =
          p.status === "Retirado"
            ? "Retirado"
            : quantity === 0
              ? "Vendido"
              : available === 0
                ? "Apartado"
                : "Disponible";
        return {
          title: p.title,
          code: p.code,
          price: Number(p.price),
          status,
          quantity,
          reserved,
          available,
          soldUnits,
          soldTotal: soldCents / 100,
        };
      })
      .filter((r) => r.quantity > 0 || r.soldUnits > 0);

    return NextResponse.json({
      cutoffDay,
      currentPeriod: current,
      period: { from, to },
      products: rows,
    });
  } catch (err) {
    console.error("GET existencias de proveedor falló", err);
    return NextResponse.json(
      { error: "No se pudieron calcular las existencias" },
      { status: 500 }
    );
  }
}
