import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";

// GET /api/suppliers/sales?from=<ISO>&to=<ISO>
// Total vendido por proveedor en el rango [from, to): por cada SaleItem,
// precio pactado × cantidad − su descuento; y el descuento al total de la
// venta (Sale.discount) se le resta completo a su proveedor — sólo se
// permite con productos de un solo proveedor (ver POST /api/sales).
//
// El rango lo manda el cliente (p. ej. inicio y fin del mes en su hora
// local) en vez de calcularlo aquí: el servidor puede correr en UTC y "este
// mes" debe ser el de la tienda.
// Cuenta ventas de caja y liquidaciones de apartados.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = new Date(searchParams.get("from") ?? "");
  const to = new Date(searchParams.get("to") ?? "");
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) {
    return NextResponse.json(
      { error: "Rango de fechas inválido" },
      { status: 400 }
    );
  }

  try {
    const sales = await prisma.sale.findMany({
      where: { date: { gte: from, lt: to } },
      select: {
        discount: true,
        SaleItem: {
          select: {
            finalPrice: true,
            quantity: true,
            discount: true,
            Product: { select: { supplierId: true } },
          },
        },
      },
    });

    // Suma en centavos para no arrastrar errores de flotante.
    const centsBySupplier = new Map<number, number>();
    const add = (supplierId: number, cents: number) =>
      centsBySupplier.set(
        supplierId,
        (centsBySupplier.get(supplierId) ?? 0) + cents
      );
    for (const sale of sales) {
      for (const item of sale.SaleItem) {
        const supplierId = item.Product.supplierId;
        if (supplierId === null) continue;
        add(
          supplierId,
          Math.round(Number(item.finalPrice) * 100) * item.quantity -
            Math.round(Number(item.discount) * 100)
        );
      }
      const saleDiscount = Math.round(Number(sale.discount) * 100);
      const owner = sale.SaleItem[0]?.Product.supplierId;
      if (saleDiscount > 0 && owner !== null && owner !== undefined) {
        add(owner, -saleDiscount);
      }
    }

    return NextResponse.json(
      Array.from(centsBySupplier, ([supplierId, cents]) => ({
        supplierId,
        total: (cents / 100).toFixed(2),
      }))
    );
  } catch (err) {
    console.error("GET ventas por proveedor falló", err);
    return NextResponse.json(
      { error: "No se pudieron cargar las ventas" },
      { status: 500 }
    );
  }
}
