"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Banknote,
  Clock,
  FileDown,
  Landmark,
  Loader2,
  Receipt,
  Search,
  Trophy,
  Wallet,
} from "lucide-react";
import { StatCard } from "../_components/stat-card";
import { SaleDetailModal } from "./_components/sale-detail-modal";
import { useTodayLabel } from "@/hooks/use-today-label";
import {
  type ApiSaleRow,
  formatMoney,
  formatSaleDate,
  methodLabel,
} from "./sales-utils";

type Period = "hoy" | "ayer" | "semana" | "mes" | "rango";
type MethodFilter = "todos" | "Efectivo" | "Tarjeta" | "Transferencia" | "Saldo";
type OriginFilter = "todos" | "caja" | "apartados";

// Nombre del periodo para el encabezado del PDF.
const PERIOD_TITLE: Record<Period, string> = {
  hoy: "Hoy",
  ayer: "Ayer",
  semana: "Esta semana",
  mes: "Este mes",
  rango: "Rango personalizado",
};

const PERIOD_LABEL: Record<Period, string> = {
  hoy: "de hoy",
  ayer: "de ayer",
  semana: "de la semana",
  mes: "del mes",
  rango: "del periodo",
};


// "YYYY-MM-DD" de un <input type="date"> → medianoche local.
const parseDateInput = (value: string) => {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const toDateInput = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

// Rango [from, to) en la hora local de quien ve la página (la de la tienda).
function periodRange(period: Period, rangeFrom: string, rangeTo: string) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const addDays = (d: Date, n: number) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  switch (period) {
    case "hoy":
      return { from: today, to: addDays(today, 1) };
    case "ayer":
      return { from: addDays(today, -1), to: today };
    case "semana": {
      // Semana de lunes a domingo.
      const monday = addDays(today, -((today.getDay() + 6) % 7));
      return { from: monday, to: addDays(monday, 7) };
    }
    case "mes":
      return {
        from: new Date(today.getFullYear(), today.getMonth(), 1),
        to: new Date(today.getFullYear(), today.getMonth() + 1, 1),
      };
    case "rango": {
      const from = parseDateInput(rangeFrom);
      const to = addDays(parseDateInput(rangeTo), 1); // incluye el día final
      return { from, to };
    }
  }
}

export default function SalesHistoryPage() {
  const todayLabel = useTodayLabel();
  const [period, setPeriod] = React.useState<Period>("hoy");
  const [rangeFrom, setRangeFrom] = React.useState(() => toDateInput(new Date()));
  const [rangeTo, setRangeTo] = React.useState(() => toDateInput(new Date()));
  const [searchTerm, setSearchTerm] = React.useState("");
  const [methodFilter, setMethodFilter] = React.useState<MethodFilter>("todos");
  const [originFilter, setOriginFilter] = React.useState<OriginFilter>("todos");
  const [sales, setSales] = React.useState<ApiSaleRow[] | null>(null);
  const [selectedSale, setSelectedSale] = React.useState<ApiSaleRow | null>(null);
  const [isExporting, setIsExporting] = React.useState(false);

  const rangeIsValid =
    period !== "rango" || (!!rangeFrom && !!rangeTo && rangeFrom <= rangeTo);

  React.useEffect(() => {
    if (!rangeIsValid) return;
    const { from, to } = periodRange(period, rangeFrom, rangeTo);
    let cancelled = false;
    setSales(null);
    (async () => {
      try {
        const res = await fetch(
          `/api/sales?from=${from.toISOString()}&to=${to.toISOString()}`
        );
        if (!res.ok) throw new Error();
        const data: ApiSaleRow[] = await res.json();
        if (!cancelled) setSales(data);
      } catch {
        if (!cancelled) setSales([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [period, rangeFrom, rangeTo, rangeIsValid]);

  // Las tarjetas resumen el periodo completo; método, origen y búsqueda
  // sólo filtran la tabla.
  const periodSales = sales ?? [];
  const totalSold = periodSales.reduce((sum, s) => sum + Number(s.total), 0);
  // Dinero por destino: efectivo en caja, banco (tarjeta + transferencia) y
  // apartados liquidados con el saldo del cliente (paymentMethod null).
  const moneyBy = { efectivo: 0, banco: 0, apartados: 0 };
  for (const s of periodSales) {
    const total = Number(s.total);
    if (s.paymentMethod === "Efectivo") moneyBy.efectivo += total;
    else if (s.paymentMethod === null) moneyBy.apartados += total;
    else moneyBy.banco += total;
  }

  // Producto más vendido del periodo, por piezas.
  const topProduct = (() => {
    const units = new Map<number, { title: string; units: number }>();
    for (const s of periodSales) {
      for (const item of s.SaleItem) {
        const prev = units.get(item.Product.id);
        units.set(item.Product.id, {
          title: item.Product.title,
          units: (prev?.units ?? 0) + item.quantity,
        });
      }
    }
    let best: { title: string; units: number } | null = null;
    for (const entry of units.values()) {
      if (!best || entry.units > best.units) best = entry;
    }
    return best;
  })();

  const term = searchTerm.trim().toLowerCase();
  const visibleSales = periodSales.filter((s) => {
    const matchesMethod =
      methodFilter === "todos" || methodLabel(s.paymentMethod) === methodFilter;
    const matchesOrigin =
      originFilter === "todos" ||
      (originFilter === "caja" ? s.Client === null : s.Client !== null);
    const matchesSearch =
      !term ||
      (s.folio ?? "").toLowerCase().includes(term) ||
      s.SaleItem.some((i) => i.Product.title.toLowerCase().includes(term));
    return matchesMethod && matchesOrigin && matchesSearch;
  });

  const isLoading = sales === null && rangeIsValid;

  // PDF con las ventas que muestra la tabla (filtros incluidos).
  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const { from, to } = periodRange(period, rangeFrom, rangeTo);
      const lastDay = new Date(to.getFullYear(), to.getMonth(), to.getDate() - 1);
      const filters: string[] = [];
      if (methodFilter !== "todos") filters.push(`Método: ${methodFilter}`);
      if (originFilter !== "todos")
        filters.push(originFilter === "caja" ? "Sólo caja" : "Sólo apartados");
      if (term) filters.push(`Búsqueda: "${searchTerm.trim()}"`);
      const { exportSalesHistoryPdf } = await import("@/lib/pdf/sales-history-report");
      await exportSalesHistoryPdf({
        periodLabel: PERIOD_TITLE[period],
        from: toDateInput(from),
        to: toDateInput(lastDay),
        filters,
        sales: visibleSales.map((s) => ({
          folio: s.folio,
          date: s.date,
          origin: s.Client ? s.Client.name : "Caja",
          products: s.SaleItem.map((i) => `${i.quantity}x ${i.Product.title}`).join(", "),
          method: methodLabel(s.paymentMethod),
          total: Number(s.total),
        })),
      });
    } catch (err) {
      console.error("Exportar historial de ventas falló", err);
      alert("No se pudo generar el reporte");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <div className="p-4 space-y-4">
        {/* Mismo layout que las páginas de lista: título a la izquierda,
            búsqueda + periodo a la derecha. */}
        <div className="flex flex-col md:flex-row md:items-center md:gap-4">
          <h1 className="text-2xl font-bold">Historial de Ventas {todayLabel}</h1>
          <div className="mt-4 md:mt-0 md:ml-auto flex flex-wrap items-center gap-2">
            <div className="relative grow">
              <Input
                placeholder="Buscar folio o producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-lg pl-10"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SelectTrigger className="cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hoy">Hoy</SelectItem>
                <SelectItem value="ayer">Ayer</SelectItem>
                <SelectItem value="semana">Esta semana</SelectItem>
                <SelectItem value="mes">Este mes</SelectItem>
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
        </div>

        {/* Highlights (StatCard): arriba el resumen del periodo, abajo el
            dinero por destino. Apartados en naranja, el color que la app ya
            usa para "apartado"; el rojo no se usa porque significa deuda. */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            color="yellow"
            icon={Receipt}
            title={`Ventas ${PERIOD_LABEL[period]}`}
            value={periodSales.length}
            hint="Caja y apartados liquidados"
            loading={isLoading}
          />
          <StatCard
            color="blue"
            icon={Wallet}
            title="Total vendido"
            value={formatMoney(totalSold)}
            hint="Suma de todas las ventas"
            loading={isLoading}
          />
          <StatCard
            color="pink"
            icon={Trophy}
            title={`Más vendido ${PERIOD_LABEL[period]}`}
            value={topProduct?.title ?? "Sin ventas"}
            valueTitle={topProduct?.title}
            hint={
              topProduct
                ? `${topProduct.units} ${topProduct.units === 1 ? "pieza" : "piezas"}`
                : "Todavía no hay ventas"
            }
            loading={isLoading}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            color="green"
            icon={Banknote}
            title="Efectivo"
            value={formatMoney(moneyBy.efectivo)}
            hint="En caja"
            loading={isLoading}
          />
          <StatCard
            color="purple"
            icon={Landmark}
            title="Banco"
            value={formatMoney(moneyBy.banco)}
            hint="Tarjeta y transferencia"
            loading={isLoading}
          />
          <StatCard
            color="orange"
            icon={Clock}
            title="Apartados"
            value={formatMoney(moneyBy.apartados)}
            hint="Liquidados con saldo"
            loading={isLoading}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={methodFilter}
            onValueChange={(v) => setMethodFilter(v as MethodFilter)}
          >
            <SelectTrigger className="cursor-pointer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los métodos</SelectItem>
              <SelectItem value="Efectivo">Efectivo</SelectItem>
              <SelectItem value="Tarjeta">Tarjeta</SelectItem>
              <SelectItem value="Transferencia">Transferencia</SelectItem>
              <SelectItem value="Saldo">Saldo (apartados)</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={originFilter}
            onValueChange={(v) => setOriginFilter(v as OriginFilter)}
          >
            <SelectTrigger className="cursor-pointer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Caja y apartados</SelectItem>
              <SelectItem value="caja">Sólo caja</SelectItem>
              <SelectItem value="apartados">Sólo apartados</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="ml-auto cursor-pointer"
            disabled={isLoading || !rangeIsValid || isExporting}
            onClick={handleExport}
          >
            {isExporting ? <Loader2 className="animate-spin" /> : <FileDown />}
            {isExporting ? "Generando PDF..." : "Exportar"}
          </Button>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Folio</TableHead>
                <TableHead>Fecha y hora</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead className="text-center">Artículos</TableHead>
                <TableHead>Método</TableHead>
                <TableHead className="pr-4 text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!rangeIsValid ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    La fecha final debe ser igual o posterior a la inicial.
                  </TableCell>
                </TableRow>
              ) : isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Cargando ventas...
                    </div>
                  </TableCell>
                </TableRow>
              ) : visibleSales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12">
                    <div className="flex flex-col items-center text-center">
                      <div className="rounded-full bg-muted p-6 mb-4">
                        <Receipt className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <p className="font-medium text-muted-foreground">
                        {periodSales.length === 0
                          ? `No hay ventas ${PERIOD_LABEL[period]}`
                          : "Ninguna venta coincide con los filtros"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                visibleSales.map((sale) => (
                  <TableRow
                    key={sale.id}
                    onClick={() => setSelectedSale(sale)}
                    className="cursor-pointer"
                  >
                    <TableCell className="pl-4 font-mono">
                      {sale.folio ?? `#${sale.id}`}
                    </TableCell>
                    <TableCell>{formatSaleDate(sale.date)}</TableCell>
                    <TableCell>
                      {sale.Client ? sale.Client.name : "Caja"}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {sale.SaleItem.reduce((sum, i) => sum + i.quantity, 0)}
                    </TableCell>
                    <TableCell>{methodLabel(sale.paymentMethod)}</TableCell>
                    <TableCell className="pr-4 text-right font-semibold tabular-nums">
                      {formatMoney(Number(sale.total))}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <SaleDetailModal
        sale={selectedSale}
        onClose={() => setSelectedSale(null)}
      />
    </>
  );
}
