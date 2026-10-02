import { Prisma } from "@/generated/prisma/client";
import { STORE_TIME_ZONE } from "@/lib/store-time";

// Folio de venta: DDMMYY-NNN — fecha en hora de la tienda + consecutivo del
// día (001, 002, …). Lo comparten la caja (POST /api/sales) y la liquidación
// de apartados, así que hay un solo consecutivo por día.
//
// La fecha es la de la tienda (hora del Pacífico, lib/store-time.ts), no la
// del servidor (que puede correr en UTC): una venta a las 11 p.m. no debe
// caer en el día siguiente.

export function folioPrefix(date: Date): string {
  const parts = new Intl.DateTimeFormat("es-MX", {
    timeZone: STORE_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get("day")}${get("month")}${get("year")}`;
}

// Siguiente folio del día, leído dentro de la transacción que crea la venta.
// Si dos ventas calculan el mismo número a la vez, el índice único de
// Sale.folio rechaza la segunda (P2002) y quien llama reintenta — ver
// isFolioCollision.
export async function nextFolio(
  tx: Prisma.TransactionClient,
  date: Date = new Date()
): Promise<string> {
  const prefix = folioPrefix(date);
  const today = await tx.sale.findMany({
    where: { folio: { startsWith: `${prefix}-` } },
    select: { folio: true },
  });
  // Máximo numérico, no orden de texto: "-1000" ordenaría antes que "-999".
  const last = today.reduce((max, s) => {
    const n = Number(s.folio?.slice(prefix.length + 1));
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  return `${prefix}-${String(last + 1).padStart(3, "0")}`;
}

export function isFolioCollision(err: unknown): boolean {
  if (
    !(err instanceof Prisma.PrismaClientKnownRequestError) ||
    err.code !== "P2002"
  ) {
    return false;
  }
  // Con el driver adapter, meta.target puede venir como arreglo de campos o
  // como nombre del índice; se acepta cualquiera que mencione "folio".
  return JSON.stringify(err.meta ?? {}).includes("folio");
}

// Cuántas veces reintentar una venta si su folio chocó con otra simultánea.
export const FOLIO_RETRIES = 3;
