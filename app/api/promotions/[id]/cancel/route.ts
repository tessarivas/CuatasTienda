import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// POST /api/promotions/[id]/cancel
// Termina una promoción antes de tiempo (o quita una programada). No se
// borra: queda como cancelada, y lo ya vendido con ella conserva su
// descuento.
export async function POST(_req: Request, { params }: Ctx) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  try {
    const { count } = await prisma.supplierPromotion.updateMany({
      where: { id, cancelledAt: null },
      data: { cancelledAt: new Date() },
    });
    if (count === 0) {
      const exists = await prisma.supplierPromotion.findUnique({ where: { id }, select: { id: true } });
      return exists
        ? NextResponse.json({ error: "Esta promoción ya estaba cancelada" }, { status: 409 })
        : NextResponse.json({ error: "Promoción no encontrada" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST cancelar promoción falló", err);
    return NextResponse.json({ error: "No se pudo cancelar la promoción" }, { status: 500 });
  }
}
