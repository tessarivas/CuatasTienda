// Forma de GET /api/dashboard (fechas como string ISO al cruzar JSON).

export type SeriesPoint = {
  date: string; // YYYY-MM-DD, día de la tienda
  efectivo: number;
  banco: number;
  apartados: number;
  count: number;
};

export type ActivityItem = {
  key: string;
  type: "venta" | "liquidacion" | "abono" | "apartado" | "alta" | "retiro";
  date: string;
  title: string;
  detail: string;
  amount: number | null;
  href: string | null;
};

export type SupplierCutoffPending = {
  supplierId: number;
  name: string;
  from: string;
  to: string;
  status: "listo" | "proximo";
  days: number;
};

export type DashboardData = {
  today: string;
  sales: { todayTotal: number; todayCount: number; yesterdayTotal: number };
  reservations: { pieces: number; clients: number; owed: number };
  inventory: { availablePieces: number; availableProducts: number };
  series: SeriesPoint[];
  topProducts: { title: string; units: number; total: number }[];
  activity: ActivityItem[];
  pending: {
    closing:
      | { status: "cerrado"; closedAt: string; closedBy: string; lateCount: number }
      | { status: "abierto"; since: string | null; cobros: number };
    receipts: { key: string; label: string; method: string; amount: number; date: string }[];
    supplierCutoffs: SupplierCutoffPending[];
    coverable: { clientId: number; name: string; balance: number; items: number }[];
    lowStock: { productId: number; title: string; supplier: string }[];
  };
};

export const money = (amount: number) =>
  `$${amount.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// "2026-10-01" → "1 oct" (sin pasar por zona horaria: es un día de la tienda).
export const dayLabel = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
};
