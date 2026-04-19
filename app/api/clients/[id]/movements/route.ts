import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// GET /api/clients/[id]/movements
// Historial merged: Payments (abonos) + Sales (liquidaciones de apartado).
// Devuelve un arreglo ordenado por fecha DESC, con shape discriminado por `type`.
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

  const [payments, sales] = await Promise.all([
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
      },
    }),
  ]);

  type Movement =
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
      };

  const movements: Movement[] = [
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
    })),
  ];

  movements.sort((a, b) => b.date.getTime() - a.date.getTime());

  return NextResponse.json(movements);
}
