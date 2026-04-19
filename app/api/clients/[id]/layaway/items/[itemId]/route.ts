import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string; itemId: string }> };

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// DELETE /api/clients/[id]/layaway/items/[itemId]
// Libera un producto apartado: elimina el LayawayItem y devuelve el Producto
// al estatus "Disponible". Si al removerlo el Layaway queda vacío, no cambia
// de estatus (sigue "Activo") — se liquidará más adelante o se cancelará a mano.
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id: rawClientId, itemId: rawItemId } = await params;
  const clientId = parseId(rawClientId);
  const itemId = parseId(rawItemId);
  if (clientId === null || itemId === null) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.layawayItem.findUnique({
        where: { id: itemId },
        include: { Layaway: { select: { clientId: true, status: true } } },
      });
      if (!item) return { error: "Apartado no encontrado" as const, status: 404 };
      if (item.Layaway.clientId !== clientId) {
        return {
          error: "Este apartado no pertenece al cliente" as const,
          status: 403,
        };
      }
      if (item.Layaway.status !== "Activo") {
        return {
          error:
            "Sólo se pueden liberar items de un apartado activo." as const,
          status: 409,
        };
      }

      // Al liberar sólo eliminamos el LayawayItem. El Product.status queda
      // intacto porque no representa reservas — esas se cuentan vía rows.
      await tx.layawayItem.delete({ where: { id: itemId } });

      return { error: null };
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE layaway item falló", err);
    return NextResponse.json(
      { error: "No se pudo liberar el apartado" },
      { status: 500 }
    );
  }
}
