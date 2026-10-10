// Roles de User.role. Es texto libre en la base para poder cambiarlo a mano
// desde el Table Editor de Supabase (columna `role` de la tabla User), así que
// se compara sin importar mayúsculas: "admin" o "Admin" también cuentan.
//
// Hoy el panel completo (/admin/* y su API) es sólo para ADMIN; un USER inicia
// sesión pero ve "Sin acceso". La regla se aplica en proxy.ts.
export const ROLE_ADMIN = "ADMIN";
export const ROLE_USER = "USER";

export function isAdminRole(role: string | null | undefined): boolean {
  return role?.trim().toUpperCase() === ROLE_ADMIN;
}
