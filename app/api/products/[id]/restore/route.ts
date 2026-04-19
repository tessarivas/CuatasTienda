import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";

type Ctx = { params: Promise<{ id: string }> };

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// POST: restaurar un producto retirado, regresándolo a "Disponible".
// Sólo aplica si el producto está en estatus "Retirado"; cualquier otro
// estado devuelve 409 para evitar mutaciones indirectas del estatus.
export async function POST(_req: Request, { params }: Ctx) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!product) {
    return NextResponse.json(
      { error: "Producto no encontrado" },
      { status: 404 }
    );
  }

  if (product.status !== "Retirado") {
    return NextResponse.json(
      {
        error:
          "Sólo se pueden restaurar productos en estatus \"Retirado\".",
      },
      { status: 409 }
    );
  }

  try {
    const updated = await prisma.product.update({
      where: { id },
      data: { status: "Disponible" },
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      );
    }
    console.error("POST /api/products/[id]/restore falló", err);
    return NextResponse.json(
      { error: "No se pudo restaurar el producto" },
      { status: 500 }
    );
  }
}
