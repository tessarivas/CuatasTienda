// app/api/me/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { supabaseServerClient } from "@/lib/supabase/server";

async function getSessionUserId() {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user.id;
}

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!dbUser) {
    return NextResponse.json(
      { error: "Usuario no encontrado" },
      { status: 404 }
    );
  }
  return NextResponse.json(dbUser);
}

export async function PATCH(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

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
  } catch (error) {
    const details = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { error: "No se pudo actualizar el perfil", details },
      { status: 500 }
    );
  }
}
