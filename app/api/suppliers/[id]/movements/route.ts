import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// GET /api/suppliers/[id]/movements
// Historial de movimientos de los productos de un proveedor, del más nuevo
// al más viejo: altas y retiros de inventario (StockMovement) y ventas
// desglosadas por producto (SaleItem, de caja y de apartados liquidados).
// Sólo lectura; los filtros (tipo, fechas, producto) los hace la pantalla.
//
// **No filtra por Product.status**: los productos retirados (soft-delete)
// tienen que seguir apareciendo aquí, o sus retiros y ventas se perderían
// del registro. Es la excepción a la regla de "Retirado no se lista".
//
// Alta inicial: al crear un producto no se escribe un StockMovement con sus
// piezas iniciales, así que aquí se reconstruye un renglón "Alta inicial"
// en la fecha de creación: existencia actual + vendidas + retiradas − altas
// posteriores. Los servicios no llevan existencia y no tienen alta.
export async function GET(_req: Request, { params }: Ctx) {
  const { id: rawId } = await params;
  const supplierId = parseId(rawId);
  if (supplierId === null) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    select: { id: true },
  });
  if (!supplier) {
    return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });
  }

  try {
    const [products, stockMovements, saleItems] = await Promise.all([
      prisma.product.findMany({
        where: { supplierId },
        select: { id: true, title: true, type: true, status: true, quantity: true, createdAt: true },
        orderBy: { title: "asc" },
      }),
      prisma.stockMovement.findMany({
        where: { Product: { supplierId } },
        select: {
          id: true,
          productId: true,
          type: true,
          quantity: true,
          reason: true,
          pickedUpBy: true,
          createdAt: true,
          User: { select: { name: true } },
        },
      }),
      prisma.saleItem.findMany({
        where: { Product: { supplierId } },
        select: {
          id: true,
          productId: true,
          quantity: true,
          finalPrice: true,
          discount: true,
          Sale: {
            select: {
              id: true,
              folio: true,
              date: true,
              discount: true,
              paymentMethod: true,
              Client: { select: { name: true } },
              User: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    const productById = new Map(products.map((p) => [p.id, p]));

    type Row = {
      key: string;
      type: "alta" | "retiro" | "venta";
      date: Date;
      productId: number;
      product: string;
      retired: boolean;
      quantity: number;
      detail: string | null;
      folio: string | null;
      amount: number | null;
      user: string | null;
    };
    const base = (productId: number) => {
      const p = productById.get(productId)!;
      return { productId, product: p.title, retired: p.status === "Retirado" };
    };

    // Unidades por producto, para reconstruir el alta inicial.
    const sold = new Map<number, number>();
    const altas = new Map<number, number>();
    const retiros = new Map<number, number>();
    const add = (map: Map<number, number>, id: number, n: number) =>
      map.set(id, (map.get(id) ?? 0) + n);

    const rows: Row[] = [];
    for (const m of stockMovements) {
      add(m.type === "Alta" ? altas : retiros, m.productId, m.quantity);
      const detail = [m.reason, m.pickedUpBy ? `Recogió ${m.pickedUpBy}` : null]
        .filter(Boolean)
        .join(" · ");
      rows.push({
        key: `mov-${m.id}`,
        type: m.type === "Alta" ? "alta" : "retiro",
        date: m.createdAt,
        ...base(m.productId),
        quantity: m.quantity,
        detail: detail || null,
        folio: null,
        amount: null,
        user: m.User.name,
      });
    }

    for (const item of saleItems) {
      add(sold, item.productId, item.quantity);
      const sale = item.Sale;
      const origin = sale.Client ? `Apartado de ${sale.Client.name}` : "Caja";
      const method = sale.paymentMethod ?? "Saldo";
      // El descuento al total sólo existe con un solo proveedor (ver
      // POST /api/sales), así que se le anota a sus renglones.
      const ticketDiscount =
        Number(sale.discount) > 0 ? `Desc. al ticket $${Number(sale.discount).toFixed(2)}` : null;
      rows.push({
        key: `venta-${item.id}`,
        type: "venta",
        date: sale.date,
        ...base(item.productId),
        quantity: item.quantity,
        detail: [origin, method, ticketDiscount].filter(Boolean).join(" · "),
        folio: sale.folio,
        amount: Number(item.finalPrice) * item.quantity - Number(item.discount),
        user: sale.User.name,
      });
    }

    for (const p of products) {
      if (p.type === "SERVICE") continue;
      const initial =
        (p.quantity ?? 0) +
        (sold.get(p.id) ?? 0) +
        (retiros.get(p.id) ?? 0) -
        (altas.get(p.id) ?? 0);
      if (initial <= 0) continue;
      rows.push({
        key: `inicial-${p.id}`,
        type: "alta",
        date: p.createdAt,
        ...base(p.id),
        quantity: initial,
        detail: "Alta inicial",
        folio: null,
        amount: null,
        user: null,
      });
    }

    rows.sort((a, b) => b.date.getTime() - a.date.getTime());

    return NextResponse.json({
      products: products.map((p) => ({
        id: p.id,
        title: p.title,
        retired: p.status === "Retirado",
      })),
      movements: rows,
    });
  } catch (err) {
    console.error("GET movimientos de proveedor falló", err);
    return NextResponse.json(
      { error: "No se pudo cargar el historial del proveedor" },
      { status: 500 }
    );
  }
}
