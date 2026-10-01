import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";

// GET /api/suppliers/sales?from=<ISO>&to=<ISO>
// Total vendido por proveedor en el rango [from, to), sumando el precio
// pactado de cada SaleItem (finalPrice), no el precio actual del producto.
//
// El rango lo manda el cliente (p. ej. inicio y fin del mes en su hora
// local) en vez de calcularlo aquí: el servidor puede correr en UTC y "este
// mes" debe ser el de la tienda.
//
// Ojo: hoy los Sale sólo se crean al liquidar apartados — la caja
// registradora no guarda ventas (no existe /api/sales). Este total cuenta
// sólo lo liquidado.
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
    const items = await prisma.saleItem.findMany({
      where: { Sale: { date: { gte: from, lt: to } } },
      select: {
        finalPrice: true,
        Product: { select: { supplierId: true } },
      },
    });

    // Suma en centavos para no arrastrar errores de flotante.
    const centsBySupplier = new Map<number, number>();
    for (const item of items) {
      const supplierId = item.Product.supplierId;
      if (supplierId === null) continue;
      const cents = Math.round(Number(item.finalPrice) * 100);
      centsBySupplier.set(
        supplierId,
        (centsBySupplier.get(supplierId) ?? 0) + cents
      );
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
