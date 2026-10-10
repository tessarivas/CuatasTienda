import { UserRole } from "@/generated/prisma/client";

// Roles de User.role (enum UserRole en la base): en el Table Editor de
// Supabase se elige ADMIN o USER de una lista, y la base rechaza otro valor.
//
// Hoy el panel completo (/admin/* y su API) es sólo para ADMIN; un USER inicia
// sesión pero ve "Sin acceso". La regla se aplica en proxy.ts.
export const ROLE_ADMIN = UserRole.ADMIN;
export const ROLE_USER = UserRole.USER;

export function isAdminRole(role: UserRole | null | undefined): boolean {
  return role === UserRole.ADMIN;
}
