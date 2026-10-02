// Zona horaria de la tienda (Baja California, hora del Pacífico). El
// servidor puede correr en UTC, así que todo lo que dependa de "qué día es"
// para la tienda (folio de venta, corte de caja) pasa por aquí.
export const STORE_TIME_ZONE = "America/Tijuana";

// Diferencia (ms) entre la hora de la tienda y UTC en un instante dado.
// Negativa en el Pacífico (−7 h en verano, −8 h en invierno).
function zoneOffsetMs(instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STORE_TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second")
  );
  return asUtc - instant.getTime();
}

// Instante UTC en que empieza (00:00 hora de la tienda) el día y/m/d.
function storeMidnight(y: number, m: number, d: number): Date {
  const naive = Date.UTC(y, m - 1, d);
  // Dos pasadas por si el día cambia de horario (DST) justo ese día.
  let instant = naive - zoneOffsetMs(new Date(naive));
  instant = naive - zoneOffsetMs(new Date(instant));
  return new Date(instant);
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

// "YYYY-MM-DD" (día de la tienda) → rango [from, to) en UTC, o null si la
// fecha no es válida.
export function storeDayRange(date: string): { from: Date; to: Date } | null {
  const match = DATE_PATTERN.exec(date);
  if (!match) return null;
  const [y, m, d] = match.slice(1).map(Number);
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  return { from: storeMidnight(y, m, d), to: storeMidnight(y, m, d + 1) };
}

// Fecha de la tienda de un instante, como "YYYY-MM-DD".
export function storeDateString(instant: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: STORE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
