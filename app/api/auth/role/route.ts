import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { isAdminRole } from "@/lib/auth/roles";

// GET /api/auth/role
// ¿La sesión actual es ADMIN? Sólo la llama proxy.ts, en cada petición al
// panel. El proxy no puede leer la base él mismo: en Netlify corre como Edge
// Function y ahí no carga `pg` (ni el cliente de Prisma). Esta ruta sí corre
// en un servidor normal.
//
// proxy.ts la deja pasar con sesión pero sin revisar rol (NO_ROLE_PATHS), si
// no, se llamaría a sí misma. Sólo dice si quien pregunta es ADMIN; no expone
// nada de nadie más.
export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });
    // Sin fila (aún no sincronizado) cuenta como sin acceso.
    return NextResponse.json(
      { isAdmin: isAdminRole(dbUser?.role) },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (err) {
    console.error("GET rol falló", err);
    return NextResponse.json({ error: "No se pudo revisar tu acceso" }, { status: 500 });
  }
}
