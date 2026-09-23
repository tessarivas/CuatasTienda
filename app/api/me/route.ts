// app/api/me/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireUser, unsyncedUserResponse } from "@/lib/auth/require-user";
import { Prisma } from "@/generated/prisma/client";

export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) {
    return unsyncedUserResponse();
  }
  return NextResponse.json(dbUser);
}

export async function PATCH(req: Request) {
  const { user, response } = await requireUser();
  if (response) return response;
  const userId = user.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const rawName = (body as { name?: unknown })?.name;
  const name = typeof rawName === "string" ? rawName.trim() : "";

  if (name.length === 0) {
    return NextResponse.json(
      { error: "El nombre es obligatorio" },
      { status: 400 }
    );
  }
  if (name.length > 100) {
    return NextResponse.json(
      { error: "El nombre es demasiado largo" },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { name },
    });
    return NextResponse.json(updated);
  } catch (err) {
    // Sin fila en User todavía: mismo contrato que payments y liquidate.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return unsyncedUserResponse();
    }
    // No se devuelve el mensaje crudo de Prisma al cliente.
    console.error("PATCH perfil falló", err);
    return NextResponse.json(
      { error: "No se pudo actualizar el perfil" },
      { status: 500 }
    );
  }
}
