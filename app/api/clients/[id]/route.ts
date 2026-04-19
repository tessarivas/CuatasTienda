import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";

type Ctx = { params: Promise<{ id: string }> };

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(_req: Request, { params }: Ctx) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) {
    return NextResponse.json(
      { error: "Cliente no encontrado" },
      { status: 404 }
    );
  }
  return NextResponse.json(client);
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const input = body as { name?: unknown; cellphone?: unknown };
  const data: Prisma.ClientUpdateInput = {};

  if (input.name !== undefined) {
    if (typeof input.name !== "string" || input.name.trim().length === 0) {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
        { status: 400 }
      );
    }
    if (input.name.trim().length > 100) {
      return NextResponse.json(
        { error: "El nombre es demasiado largo" },
        { status: 400 }
      );
    }
    data.name = input.name.trim();
  }

  if (input.cellphone !== undefined) {
    if (input.cellphone === null || input.cellphone === "") {
      data.cellphone = null;
    } else if (typeof input.cellphone === "string") {
      data.cellphone = input.cellphone.trim();
    } else {
      return NextResponse.json(
        { error: "Teléfono inválido" },
        { status: 400 }
      );
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "No hay cambios para aplicar" },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.client.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }
    console.error("PATCH cliente falló", err);
    return NextResponse.json(
      { error: "No se pudo actualizar el cliente" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const client = await prisma.client.findUnique({
    where: { id },
    select: { id: true, currentBalance: true },
  });
  if (!client) {
    return NextResponse.json(
      { error: "Cliente no encontrado" },
      { status: 404 }
    );
  }

  if (!client.currentBalance.equals(0)) {
    return NextResponse.json(
      {
        error:
          "No se puede eliminar un cliente con saldo distinto de cero. Liquida su cuenta primero.",
      },
      { status: 409 }
    );
  }

  // Refuse if they still have an active Layaway with items.
  const activeItems = await prisma.layawayItem.count({
    where: {
      Layaway: { clientId: id, status: "Activo" },
    },
  });
  if (activeItems > 0) {
    return NextResponse.json(
      {
        error:
          "No se puede eliminar un cliente con productos apartados. Libera o liquida el apartado primero.",
      },
      { status: 409 }
    );
  }

  try {
    await prisma.client.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }
    console.error("DELETE cliente falló", err);
    return NextResponse.json(
      { error: "No se pudo eliminar el cliente" },
      { status: 500 }
    );
  }
}
