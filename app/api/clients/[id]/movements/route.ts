import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// GET /api/clients/[id]/movements
// Historial merged, la lista en papel del cliente: LayawayItems (+ apartado),
// Payments (− abono) y Sales (liquidaciones). Devuelve un arreglo ordenado por
// fecha DESC, con shape discriminado por `type`.
//
// `legacy` en una liquidación = venta sin LayawayItems ligados, de antes de
// que los items dejaran de borrarse. Su renglón "+ apartado" ya no existe, así
// que el cliente debe tratar esa liquidación como apartado y venta a la vez
// para que el resta corriente cuadre con el saldo real.
export async function GET(_req: Request, { params }: Ctx) {
  const { id: rawId } = await params;
  const clientId = parseId(rawId);
  if (clientId === null) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const clientExists = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true },
  });
  if (!clientExists) {
    return NextResponse.json(
      { error: "Cliente no encontrado" },
      { status: 404 }
    );
  }

  const [items, payments, sales] = await Promise.all([
    prisma.layawayItem.findMany({
      where: { Layaway: { clientId } },
      include: { Product: { select: { title: true } } },
    }),
    prisma.payment.findMany({
      where: { clientId },
      orderBy: { date: "desc" },
    }),
    prisma.sale.findMany({
      where: { clientId },
      orderBy: { date: "desc" },
      include: {
        SaleItem: {
          include: { Product: { select: { id: true, title: true } } },
        },
        _count: { select: { LayawayItem: true } },
      },
    }),
  ]);

  type Movement =
    | {
        type: "apartado";
        id: number;
        date: Date;
        amount: string;
        title: string;
        status: "Activo" | "Liquidado" | "Cancelado";
      }
    | {
        type: "abono";
        id: number;
        date: Date;
        amount: string;
        method: string;
      }
    | {
        type: "liquidacion";
        id: number;
        date: Date;
        amount: string;
        items: { productId: number; title: string; finalPrice: string }[];
        legacy: boolean;
      };

  const movements: Movement[] = [
    ...items.map<Movement>((i) => ({
      type: "apartado",
      id: i.id,
      date: i.createdAt,
      amount: i.price.toFixed(2),
      title: i.Product.title,
      status: i.status,
    })),
    ...payments.map<Movement>((p) => ({
      type: "abono",
      id: p.id,
      date: p.date,
      amount: p.amount.toFixed(2),
      method: p.method,
    })),
    ...sales.map<Movement>((s) => ({
      type: "liquidacion",
      id: s.id,
      date: s.date,
      amount: s.total.toFixed(2),
      items: s.SaleItem.map((si) => ({
        productId: si.productId,
        title: si.Product.title,
        finalPrice: si.finalPrice.toFixed(2),
      })),
      legacy: s._count.LayawayItem === 0,
    })),
  ];

  // Empates de fecha: en orden de lectura va primero el apartado, luego el
  // abono, luego la liquidación. Como aquí es DESC, el rango va invertido.
  const rank = { apartado: 0, abono: 1, liquidacion: 2 } as const;
  movements.sort(
    (a, b) =>
      b.date.getTime() - a.date.getTime() || rank[b.type] - rank[a.type]
  );

  return NextResponse.json(movements);
}
