"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Banknote, History, Landmark, Loader2, Wallet } from "lucide-react";
import { StatCard } from "../../_components/stat-card";
import { formatMoney } from "../../sales/sales-utils";

// Forma de GET /api/cash-closing/history. Decimal llega como string; date
// es la columna @db.Date ("2026-10-01T00:00:00.000Z").
type HistoryRow = {
  id: number;
  date: string;
  cashSales: string;
  cashPayments: string;
  bankTotal: string;
  expectedCash: string;
  pendingReceipts: number;
  User: { name: string };
};

type Period = "mes" | "mes-pasado" | "rango";

const PERIOD_LABEL: Record<Period, string> = {
  mes: "este mes",
  "mes-pasado": "el mes pasado",
  rango: "el periodo",
};

// Día local (el de la tienda) como "YYYY-MM-DD".
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Primer y último día del periodo, ambos inclusive.
function periodRange(period: Period, from: string, to: string) {
  const now = new Date();
  if (period === "mes") {
    return { from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), to: ymd(now) };
  }
  if (period === "mes-pasado") {
    return {
      from: ymd(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      to: ymd(new Date(now.getFullYear(), now.getMonth(), 0)),
    };
  }
  return { from, to };
}

interface ClosingHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  // Recibe "YYYY-MM-DD" del corte elegido.
  onSelect: (date: string) => void;
}

// "Cortes anteriores": los cortes de un periodo y sus totales sumados (lo
// que entró a caja y banco). Es distinto del Historial de Ventas, que suma
// ventas: un abono cuenta aquí el día que entra y allá cuando se liquida.
export function ClosingHistoryDialog({ open, onClose, onSelect }: ClosingHistoryDialogProps) {
  const [rows, setRows] = React.useState<HistoryRow[] | null>(null);
  const [period, setPeriod] = React.useState<Period>("mes");
  const [rangeFrom, setRangeFrom] = React.useState(() => ymd(new Date()));
  const [rangeTo, setRangeTo] = React.useState(() => ymd(new Date()));

  const rangeValid = period !== "rango" || (!!rangeFrom && !!rangeTo && rangeFrom <= rangeTo);

  React.useEffect(() => {
    if (!open || !rangeValid) return;
    const { from, to } = periodRange(period, rangeFrom, rangeTo);
    let cancelled = false;
    setRows(null);
    (async () => {
      try {
        const res = await fetch(`/api/cash-closing/history?from=${from}&to=${to}`);
        if (!res.ok) throw new Error();
        const data: HistoryRow[] = await res.json();
        if (!cancelled) setRows(data);
      } catch {
        if (!cancelled) setRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, period, rangeFrom, rangeTo, rangeValid]);

  // Totales del periodo. El efectivo es lo que entró por ventas y pedidos,
  // sin el fondo de cada día (sumar fondos inflaría la cifra).
  const list = rows ?? [];
  const sum = (pick: (r: HistoryRow) => number) => list.reduce((total, r) => total + pick(r), 0);
  const cash = sum((r) => Number(r.cashSales));
  const apartados = sum((r) => Number(r.cashPayments));
  const bank = sum((r) => Number(r.bankTotal));
  const isLoading = rows === null && rangeValid;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Cortes anteriores
          </DialogTitle>
          <DialogDescription>
            Elige un corte para verlo, adjuntar comprobantes o corregirlo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="cursor-pointer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mes">Este mes</SelectItem>
              <SelectItem value="mes-pasado">Mes pasado</SelectItem>
              <SelectItem value="rango">Rango personalizado</SelectItem>
            </SelectContent>
          </Select>
          {period === "rango" && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={rangeFrom}
                onChange={(e) => setRangeFrom(e.target.value)}
                className="w-40"
                aria-label="Desde"
              />
              <span className="text-sm text-muted-foreground">a</span>
              <Input
                type="date"
                value={rangeTo}
                onChange={(e) => setRangeTo(e.target.value)}
                className="w-40"
                aria-label="Hasta"
              />
            </div>
          )}
        </div>

        {/* Totales del periodo, con las mismas tarjetas que el corte. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            color="yellow"
            icon={Wallet}
            title="Total cobrado"
            value={formatMoney(cash + apartados + bank)}
            hint={
              isLoading
                ? undefined
                : `${list.length} ${list.length === 1 ? "corte" : "cortes"} de ${PERIOD_LABEL[period]}`
            }
            loading={isLoading}
          />
          <StatCard
            color="blue"
            icon={Banknote}
            title="Efectivo"
            value={formatMoney(cash)}
            hint="Ventas y pedidos, sin el fondo"
            loading={isLoading}
          />
          <StatCard
            color="pink"
            icon={Landmark}
            title="Banco"
            value={formatMoney(bank)}
            hint="Tarjeta y transferencia"
            loading={isLoading}
          />
        </div>
        {!isLoading && list.length > 0 && (
          <p className="-mt-1 text-xs text-muted-foreground">
            Caja de apartados: {formatMoney(apartados)} en abonos en efectivo. Ya va incluido en el total
            cobrado.
          </p>
        )}

        <div className="max-h-[40vh] overflow-y-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Fecha</TableHead>
                {/* Mismas cifras que las tarjetas del corte: total cobrado,
                    efectivo esperado (caja principal) y banco. */}
                <TableHead className="text-center">Total cobrado</TableHead>
                <TableHead className="text-center">Efectivo esperado</TableHead>
                <TableHead className="text-center">Banco</TableHead>
                <TableHead className="text-center">Pendientes</TableHead>
                <TableHead className="pr-4 text-center">Cerró</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!rangeValid ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                    La fecha final debe ser igual o posterior a la inicial.
                  </TableCell>
                </TableRow>
              ) : rows === null ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-20">
                    <div className="flex justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                    No hay cortes cerrados en {PERIOD_LABEL[period]}.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const day = row.date.slice(0, 10);
                  return (
                    <TableRow key={row.id} className="cursor-pointer" onClick={() => onSelect(day)}>
                      <TableCell className="pl-4">{day.split("-").reverse().join("/")}</TableCell>
                      <TableCell className="text-center tabular-nums">
                        {formatMoney(Number(row.cashSales) + Number(row.cashPayments) + Number(row.bankTotal))}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {formatMoney(Number(row.expectedCash))}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {formatMoney(Number(row.bankTotal))}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {row.pendingReceipts > 0 ? row.pendingReceipts : "Ninguno"}
                      </TableCell>
                      <TableCell className="pr-4 text-center">{row.User.name}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
