import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// GET /api/clients/[id]/layaway
// Devuelve el Layaway activo del cliente con sus items (incluyendo el producto
// ligado). Si no hay apartado activo devuelve null — no es un 404.
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

  const layaway = await prisma.layaway.findFirst({
    where: { clientId, status: "Activo" },
    include: {
      LayawayItem: {
        include: { Product: true },
        orderBy: { id: "asc" },
      },
    },
  });

  return NextResponse.json(layaway);
}
