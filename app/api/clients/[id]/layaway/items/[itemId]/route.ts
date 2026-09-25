import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string; itemId: string }> };

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// DELETE /api/clients/[id]/layaway/items/[itemId]
// Libera un producto apartado: marca el LayawayItem como "Cancelado" (no lo
// borra — queda en el historial del cliente, tachado) y así deja de contar
// como reserva. Si el Layaway queda sin items activos, no cambia de estatus
// (sigue "Activo") — el siguiente apartado del cliente se suma ahí.
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

      if (item.status !== "Activo") {
        return {
          error: "Este producto ya no está apartado." as const,
          status: 409,
        };
      }

      // El Product.status queda intacto porque no representa reservas —
      // esas se cuentan vía items con status "Activo".
      await tx.layawayItem.update({
        where: { id: itemId },
        data: { status: "Cancelado", resolvedAt: new Date() },
      });

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
