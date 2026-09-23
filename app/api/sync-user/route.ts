// app/api/sync-user/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";

export async function POST() {
  try {
    const { user, response } = await requireUser();
    if (response) return response;

    const email = user.email;
    if (!email) {
      return NextResponse.json(
        { error: "La cuenta de Supabase no tiene correo" },
        { status: 400 }
      );
    }

    const metadataName =
      typeof user.user_metadata?.name === "string" &&
      user.user_metadata.name.trim().length > 0
        ? user.user_metadata.name.trim()
        : null;

    const fallbackName = email.split("@")[0];

    const dbUser = await prisma.user.upsert({
      where: { id: user.id },
      // On update we keep Supabase email in sync but never touch `name` —
      // the display name is owned by PATCH /api/me from the moment the row exists.
      update: { email },
      create: {
        id: user.id,
        email,
        name: metadataName ?? fallbackName,
        role: "USER",
      },
    });

    return NextResponse.json({ success: true, user: dbUser });
  } catch (error) {
    const details = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { error: "No se pudo sincronizar el usuario", details },
      { status: 500 }
    );
  }
}
