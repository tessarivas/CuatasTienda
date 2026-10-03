import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";
import { storeDayRange, storeDateString } from "@/lib/store-time";
import { cutoffPeriodFor, effectiveCutoffDay } from "@/lib/suppliers/cutoff";

type Ctx = { params: Promise<{ id: string }> };

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// GET /api/suppliers/[id]/cutoff?from=YYYY-MM-DD&to=YYYY-MM-DD
// Corte del proveedor: lo vendido de sus productos en el rango (días de la
// tienda, ambos inclusive). Sin from/to, el periodo de corte en curso según
// su día de corte (lib/suppliers/cutoff.ts). Sólo lectura.
//
// La tienda no cobra comisión (el proveedor renta el espacio), así que el
// total vendido es la ganancia del proveedor. Cuenta ventas de caja y
// liquidaciones de apartados: precio pactado × cantidad − descuento de la
// línea, y el descuento al total de una venta se le resta completo (sólo se
// permite con productos de un solo proveedor, ver POST /api/sales).
export async function GET(req: Request, { params }: Ctx) {
  const { id: rawId } = await params;
  const supplierId = parseId(rawId);
  if (supplierId === null) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    select: { id: true, cutoffDay: true, createdAt: true },
  });
  if (!supplier) {
    return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });
  }

  const cutoffDay = effectiveCutoffDay(
    supplier.cutoffDay,
    storeDateString(supplier.createdAt)
  );
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
    const [items, saleDiscounts, products] = await Promise.all([
      prisma.saleItem.findMany({
        where: {
          Product: { supplierId },
          Sale: { date: { gte: fromRange.from, lt: toRange.to } },
        },
        select: {
          saleId: true,
          Sale: { select: { folio: true, date: true } },
          quantity: true,
          finalPrice: true,
          discount: true,
          Product: { select: { id: true, title: true } },
        },
      }),
      // Descuento al total de ventas de este proveedor en el rango.
      prisma.sale.findMany({
        where: {
          date: { gte: fromRange.from, lt: toRange.to },
          discount: { gt: 0 },
          SaleItem: { some: { Product: { supplierId } } },
        },
        select: { id: true, discount: true },
      }),
      prisma.product.findMany({
        where: { supplierId, type: "PRODUCT", status: { not: "Retirado" } },
        select: {
          quantity: true,
          _count: {
            select: {
              LayawayItem: {
                where: { status: "Activo", Layaway: { status: "Activo" } },
              },
            },
          },
        },
      }),
    ]);

    // En centavos para no arrastrar errores de flotante.
    let totalCents = 0;
    let unitsSold = 0;
    const byProduct = new Map<number, { title: string; units: number; cents: number }>();
    // Detalle por venta para el reporte: sólo las líneas de este proveedor.
    const bySale = new Map<
      number,
      {
        folio: string | null;
        date: Date;
        lines: { title: string; quantity: number; cents: number }[];
        discountCents: number;
      }
    >();
    for (const item of items) {
      const cents =
        Math.round(Number(item.finalPrice) * 100) * item.quantity -
        Math.round(Number(item.discount) * 100);
      totalCents += cents;
      unitsSold += item.quantity;
      const prev = byProduct.get(item.Product.id);
      byProduct.set(item.Product.id, {
        title: item.Product.title,
        units: (prev?.units ?? 0) + item.quantity,
        cents: (prev?.cents ?? 0) + cents,
      });
      const sale = bySale.get(item.saleId) ?? {
        folio: item.Sale.folio,
        date: item.Sale.date,
        lines: [],
        discountCents: 0,
      };
      sale.lines.push({ title: item.Product.title, quantity: item.quantity, cents });
      bySale.set(item.saleId, sale);
    }
    for (const s of saleDiscounts) {
      const cents = Math.round(Number(s.discount) * 100);
      totalCents -= cents;
      const sale = bySale.get(s.id);
      if (sale) sale.discountCents = cents;
    }

    // Productos con al menos una unidad libre (no apartada).
    const availableProducts = products.filter(
      (p) => (p.quantity ?? 0) - p._count.LayawayItem > 0
    ).length;

    return NextResponse.json({
      cutoffDay,
      currentPeriod: current,
      period: { from, to },
      totalSold: (totalCents / 100).toFixed(2),
      unitsSold,
      salesCount: new Set(items.map((i) => i.saleId)).size,
      availableProducts,
      products: Array.from(byProduct.values())
        .sort((a, b) => b.cents - a.cents)
        .map((p) => ({ title: p.title, units: p.units, total: (p.cents / 100).toFixed(2) })),
      sales: Array.from(bySale.values())
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map((s) => ({
          folio: s.folio,
          date: s.date,
          lines: s.lines.map((l) => ({
            title: l.title,
            quantity: l.quantity,
            total: (l.cents / 100).toFixed(2),
          })),
          discount: (s.discountCents / 100).toFixed(2),
          total: (
            (s.lines.reduce((sum, l) => sum + l.cents, 0) - s.discountCents) /
            100
          ).toFixed(2),
        })),
    });
  } catch (err) {
    console.error("GET corte de proveedor falló", err);
    return NextResponse.json(
      { error: "No se pudo calcular el corte del proveedor" },
      { status: 500 }
    );
  }
}
