import type { Prisma } from "@/generated/prisma/client";

// Folio de los pedidos de servicio: letras del proveedor + consecutivo,
// p. ej. Compuservi → CO-001, Cuatas → CU-001, Full Moons → FM-001.

// Letras por defecto: con dos palabras o más, la inicial de las dos primeras
// (Full Moons → FM); con una, sus dos primeras letras (Compuservi → CO). Sin
// acentos ni símbolos, en mayúsculas. Se pueden cambiar en "Editar
// proveedor" (Supplier.servicePrefix), por si dos proveedores chocan.
export function defaultServicePrefix(name: string): string {
  const words = name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);
  if (words.length === 0) return "SV";
  if (words.length === 1) return words[0].slice(0, 2).padEnd(2, "X");
  return words[0][0] + words[1][0];
}

export function servicePrefixFor(supplier: {
  servicePrefix: string | null;
  businessName: string | null;
  name: string;
}): string {
  return supplier.servicePrefix?.trim() || defaultServicePrefix(supplier.businessName || supplier.name);
}

// Letras válidas al editarlas a mano: 1 a 4 letras o números.
export const SERVICE_PREFIX_PATTERN = /^[A-Z0-9]{1,4}$/;

// Siguiente folio para esas letras. El consecutivo es por letras (no por
// proveedor), así que si dos proveedores comparten letras no se repite el
// folio. La unicidad la garantiza el índice único de ServiceOrder.folio; quien
// llama reintenta la transacción si choca (P2002), como el folio de ventas.
export async function nextServiceFolio(tx: Prisma.TransactionClient, prefix: string) {
  const existing = await tx.serviceOrder.findMany({
    where: { folio: { startsWith: `${prefix}-` } },
    select: { folio: true },
  });
  const max = existing.reduce((m, o) => {
    const n = Number(o.folio.slice(prefix.length + 1));
    return Number.isInteger(n) && n > m ? n : m;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

export const SERVICE_FOLIO_RETRIES = 3;
