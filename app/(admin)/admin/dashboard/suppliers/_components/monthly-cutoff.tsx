"use client";

import * as React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CardActionButton } from "./card-action-button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Calendar as CalendarIcon,
  DollarSign,
  FileDown,
  Loader2,
  Package,
  RefreshCw,
  RotateCcw,
  ShoppingBag,
} from "lucide-react";
import { type Supplier } from "@/lib/data";
import { cn } from "@/lib/utils";
import { shortDate } from "@/lib/suppliers/cutoff";
import { StatCard } from "../../_components/stat-card";
import { formatMoney } from "../../sales/sales-utils";
import { EditCutoffDayModal } from "./edit-cutoff-day-modal";

interface MonthlyCutoffProps {
  supplier: Supplier;
  onCutoffDayChange: (newDay: number) => void;
}

// Forma de GET /api/suppliers/[id]/cutoff.
type CutoffData = {
  cutoffDay: number;
  currentPeriod: { from: string; to: string };
  period: { from: string; to: string };
  totalSold: string;
  unitsSold: number;
  salesCount: number;
  availableProducts: number;
  products: { title: string; units: number; total: string }[];
  sales: {
    folio: string | null;
    date: string;
    lines: { title: string; quantity: number; total: string }[];
    discount: string;
    total: string;
  }[];
};

// Date (del calendario) ↔ "YYYY-MM-DD" del día local (el de la tienda).
const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fromDateStr = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export function MonthlyCutoff({
  supplier,
  onCutoffDayChange,
}: MonthlyCutoffProps) {
  const [startDate, setStartDate] = React.useState<Date | undefined>();
  const [endDate, setEndDate] = React.useState<Date | undefined>();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [data, setData] = React.useState<CutoffData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);

  // Sin rango: el periodo de corte en curso (lo calcula el servidor con el
  // día de corte del proveedor). Con rango: el que se eligió en el filtro.
  const load = React.useCallback(
    async (range?: { from: string; to: string }) => {
      setIsLoading(true);
      try {
        const query = range ? `?from=${range.from}&to=${range.to}` : "";
        const res = await fetch(`/api/suppliers/${supplier.id}/cutoff${query}`);
        if (!res.ok) {
          const { error: message } = await res.json();
          alert(message ?? "No se pudo calcular el corte");
          return;
        }
        const json: CutoffData = await res.json();
        setData(json);
        setStartDate(fromDateStr(json.period.from));
        setEndDate(fromDateStr(json.period.to));
      } catch {
        alert("No se pudo calcular el corte");
      } finally {
        setIsLoading(false);
      }
    },
    [supplier.id]
  );

  // Al abrir y cuando cambia el día de corte: periodo en curso.
  React.useEffect(() => {
    load();
  }, [load, supplier.cutoffDay]);

  const handleRefresh = () => {
    if (!startDate || !endDate) return;
    load({ from: toDateStr(startDate), to: toDateStr(endDate) });
  };

  // El PDF se arma con el periodo que se está viendo (actual o elegido). La
  // librería de PDF se carga sólo al exportar.
  const handleExport = async () => {
    if (!data || isExporting) return;
    setIsExporting(true);
    try {
      const { exportSupplierCutoffPdf } = await import(
        "@/lib/pdf/supplier-cutoff-report"
      );
      await exportSupplierCutoffPdf({
        ...data,
        supplierName: supplier.businessName,
        isCurrentPeriod,
      });
    } catch (err) {
      console.error("Exportar corte de proveedor falló", err);
      alert("No se pudo generar el reporte");
    } finally {
      setIsExporting(false);
    }
  };

  const rangeIsValid = !!startDate && !!endDate && startDate <= endDate;
  const isCurrentPeriod =
    !!data &&
    data.period.from === data.currentPeriod.from &&
    data.period.to === data.currentPeriod.to;

  return (
    <>
      <Card className="flex flex-col h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              <CardTitle className="text-lg">Corte Mensual</CardTitle>
            </div>
            <CardActionButton onClick={() => setIsModalOpen(true)}>
              Corte: Día {data?.cutoffDay ?? supplier.cutoffDay}
            </CardActionButton>
          </div>
          {/* Leyenda en gris: qué periodo se está viendo. */}
          <CardDescription className="text-sm">
            {data
              ? `${isCurrentPeriod ? "Periodo actual" : "Rango elegido"}: del ${shortDate(data.period.from)} al ${shortDate(data.period.to)}.`
              : "Ventas del proveedor en el periodo de corte."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 flex-1 -mt-2">
          <div className="grid gap-3">
            <StatCard
              color="yellow"
              icon={DollarSign}
              title="Total vendido"
              value={formatMoney(Number(data?.totalSold ?? 0))}
              hint="Ganancia del proveedor en el periodo"
              loading={isLoading}
            />
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                color="blue"
                icon={Package}
                title="Productos disponibles"
                value={data?.availableProducts ?? 0}
                hint="Con unidades libres hoy"
                loading={isLoading}
              />
              <StatCard
                color="pink"
                icon={ShoppingBag}
                title="Piezas vendidas"
                value={data?.unitsSold ?? 0}
                hint={
                  data
                    ? `En ${data.salesCount} ${data.salesCount === 1 ? "venta" : "ventas"}`
                    : undefined
                }
                loading={isLoading}
              />
            </div>
          </div>

          {/* Filtro por fechas: por defecto, el periodo de corte actual. */}
          <div className="space-y-2 p-3 bg-muted/30 rounded-lg border">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Filtrar por fechas</Label>
              {data && !isCurrentPeriod && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 cursor-pointer px-2 text-xs"
                  onClick={() => load()}
                >
                  <RotateCcw className="h-3 w-3" />
                  Periodo actual
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Inicio", value: startDate, set: setStartDate },
                { label: "Fin", value: endDate, set: setEndDate },
              ].map(({ label, value, set }) => (
                <Popover key={label}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "justify-start text-left font-normal text-xs cursor-pointer",
                        !value && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="h-3 w-3" />
                      {value ? format(value, "dd/MM/yyyy", { locale: es }) : label}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={value}
                      onSelect={set}
                      autoFocus
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Button
              onClick={handleRefresh}
              disabled={!rangeIsValid || isLoading}
              className="w-full cursor-pointer"
              size="sm"
              title={!rangeIsValid ? "La fecha de fin debe ser igual o posterior al inicio" : undefined}
            >
              <RefreshCw />
              Actualizar Datos
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full cursor-pointer"
              disabled={!data || isLoading || isExporting}
              onClick={handleExport}
            >
              {isExporting ? <Loader2 className="animate-spin" /> : <FileDown />}
              {isExporting ? "Generando PDF..." : "Exportar Reporte"}
            </Button>
          </div>
        </CardContent>
      </Card>
      <EditCutoffDayModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        supplier={supplier}
        onSave={onCutoffDayChange}
      />
    </>
  );
}
