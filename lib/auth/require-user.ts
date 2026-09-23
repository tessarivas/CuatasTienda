// Helper compartido para las rutas que necesitan el objeto usuario de la sesión
// (por ejemplo para derivar `receivedBy` o `userId`). El gate general de /api/*
// vive en middleware.ts; esto NO es una segunda verificación para todas las
// rutas, sólo para las que además usan la identidad.
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { supabaseServerClient } from "@/lib/supabase/server";
import { Prisma } from "@/generated/prisma/client";

export type RequireUserResult =
  | { user: User; response?: undefined }
  | { user?: undefined; response: NextResponse };

// Devuelve el usuario de la sesión, o la respuesta 401 ya construida.
// Uso: const { user, response } = await requireUser(); if (response) return response;
export async function requireUser(): Promise<RequireUserResult> {
  const supabase = await supabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      response: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
    };
  }

  return { user };
}

// El usuario de Supabase es válido pero todavía no tiene fila en la tabla User
// (primer login sin pasar por /api/sync-user). Prisma lo reporta como P2003 al
// violar la FK de Payment.receivedBy / Sale.userId.
export function isUnsyncedUserError(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003"
  );
}

export function unsyncedUserResponse(): NextResponse {
  return NextResponse.json(
    {
      error:
        "Tu usuario aún no está sincronizado. Vuelve a iniciar sesión e intenta de nuevo.",
    },
    { status: 409 }
  );
}
