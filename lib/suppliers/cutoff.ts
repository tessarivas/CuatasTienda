// Periodos de corte de proveedor. Funciones puras sobre fechas "YYYY-MM-DD"
// (día de la tienda, sin hora), usables en servidor y en navegador.
//
// Reglas de la tienda:
//   - Cada proveedor corta un día del mes (Supplier.cutoffDay, 1–31). Si no
//     tiene, se usa el día en que se dio de alta.
//   - Un periodo va del día de corte al día anterior al siguiente corte. Con
//     corte el 16: del 16 de septiembre al 15 de octubre (inclusive).
//   - Si el mes no tiene ese día (corte 29/30/31), el corte de ese mes pasa
//     al día 1 del mes siguiente. Corte 31: 31 ago, 1 oct (sept no tiene 31),
//     31 oct, 1 dic, …

type YMD = { y: number; m: number; d: number }; // m: 1–12

const pad = (n: number) => String(n).padStart(2, "0");
const toStr = ({ y, m, d }: YMD) => `${y}-${pad(m)}-${pad(d)}`;
const parse = (s: string): YMD => {
  const [y, m, d] = s.split("-").map(Number);
  return { y, m, d };
};
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const addMonths = (y: number, m: number, n: number) => {
  const total = y * 12 + (m - 1) + n;
  return { y: Math.floor(total / 12), m: (total % 12) + 1 };
};
const addDays = (date: string, n: number) => {
  const { y, m, d } = parse(date);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return toStr({ y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() });
};

// Fecha de corte del mes nominal (y, m) para el día `day`.
export function cutoffDateFor(y: number, m: number, day: number): string {
  if (day <= daysInMonth(y, m)) return toStr({ y, m, d: day });
  const next = addMonths(y, m, 1);
  return toStr({ ...next, d: 1 });
}

// Periodo de corte que contiene `date`: { from, to } inclusive.
export function cutoffPeriodFor(day: number, date: string): { from: string; to: string } {
  const { y, m } = parse(date);
  // El corte de este mes puede caer después de `date` (o, con overflow, el
  // del mes pasado puede caer este mes): se busca el último corte <= date.
  let nominal = { y, m };
  let start = cutoffDateFor(nominal.y, nominal.m, day);
  while (start > date) {
    nominal = addMonths(nominal.y, nominal.m, -1);
    start = cutoffDateFor(nominal.y, nominal.m, day);
  }
  const following = addMonths(nominal.y, nominal.m, 1);
  const nextCutoff = cutoffDateFor(following.y, following.m, day);
  return { from: start, to: addDays(nextCutoff, -1) };
}

// Día de corte efectivo: el guardado o, si no hay, el día de alta.
export function effectiveCutoffDay(
  cutoffDay: number | null | undefined,
  createdAtStoreDate: string
): number {
  return cutoffDay ?? parse(createdAtStoreDate).d;
}

// "2026-09-16" → "16 sep" (para leyendas).
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export function shortDate(date: string): string {
  const { m, d } = parse(date);
  return `${d} ${MONTHS[m - 1]}`;
}
