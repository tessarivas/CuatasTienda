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
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TrendingUp,
  FileDown,
  Calendar as CalendarIcon,
  DollarSign,
  Package,
} from "lucide-react";
import { type Supplier } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EditCutoffDayModal } from "./edit-cutoff-day-modal";

interface MonthlyCutoffProps {
  supplier: Supplier;
  onCutoffDayChange: (newDay: number) => void;
}

export function MonthlyCutoff({
  supplier,
  onCutoffDayChange,
}: MonthlyCutoffProps) {
  const [startDate, setStartDate] = React.useState<Date | undefined>();
  const [endDate, setEndDate] = React.useState<Date | undefined>();
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  // Simulación de métricas de ventas
  const totalSold = 15200.5;
  const productsSoldCount = 89;
  const estimatedProfit = totalSold * 0.3; // puede ser comparado al mes anterior

  const handleGenerateReport = () => {
    console.log(
      `Generando reporte para ${supplier.businessName} de ${startDate} a ${endDate}`,
    );
  };

  return (
    <>
      <Card className="flex flex-col h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              <CardTitle className="text-lg">Corte Mensual</CardTitle>
            </div>
            <Button
              variant="outline"
              className="text-xs py-1 rounded-full cursor-pointer"
              onClick={() => setIsModalOpen(true)}
            >
              Corte: Día {supplier.cutoffDay}
            </Button>
          </div>
          <CardDescription className="text-sm">
            Genera reportes de ventas del proveedor en el periodo seleccionado.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 flex-1 -mt-2">
          {/* Métricas con gradientes */}
          <div className="grid gap-3">
            {/* Total Vendido */}
            <div className="relative overflow-hidden rounded-lg bg-yellow-100 p-4 text-yellow-600">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold opacity-90 mb-1">
                    Total Vendido
                  </p>
                  <div className="text-2xl font-bold">
                    ${totalSold.toLocaleString("es-MX")}
                  </div>
                </div>
                <div className="rounded-full p-2">
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* Grid de dos columnas para las otras métricas */}
            <div className="grid grid-cols-2 gap-3">
              {/* Productos Vendidos */}
              <div className="relative overflow-hidden rounded-lg bg-sky-100 p-3 text-sky-600">
                <div className="flex flex-col justify-between h-full">
                  <div className="rounded-full p-1.5 w-fit">
                    <Package className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold opacity-90 mb-1">Productos Disponibles</p>
                    <div className="text-xl font-bold">+{productsSoldCount}</div>
                    <p className="text-xs opacity-75">
                      en el periodo seleccionado
                    </p>
                  </div>
                </div>
              </div>

              {/* Ganancia Estimada */}
              <div className="relative overflow-hidden rounded-lg bg-rose-100 p-3 text-rose-600">
                <div className="flex flex-col justify-between h-full">
                  <div className="rounded-full p-1.5 w-fit">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold opacity-90 mb-1">Ganancia</p>
                    <div className="text-xl font-bold">
                      $
                      {estimatedProfit.toLocaleString("es-MX", {
                        maximumFractionDigits: 0,
                      })}
                    </div>
                    <p className="text-xs opacity-75">
                      comparado al periodo anterior
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filtros de fecha compactos */}
          <div className="space-y-2 p-3 bg-muted/30 rounded-lg border">
            <Label className="text-xs font-semibold">Filtrar por fechas</Label>
            <div className="grid grid-cols-2 gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "justify-start text-left font-normal text-xs cursor-pointer",
                      !startDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-1.5 h-3 w-3" />
                    {startDate ? (
                      format(startDate, "dd/MM/yyyy", { locale: es })
                    ) : (
                      <span>Inicio</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "justify-start text-left font-normal text-xs cursor-pointer",
                      !endDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-1.5 h-3 w-3" />
                    {endDate ? (
                      format(endDate, "dd/MM/yyyy", { locale: es })
                    ) : (
                      <span>Fin</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="space-y-2">
            <Button
              onClick={handleGenerateReport}
              className="w-full cursor-pointer bg-linear-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              size="sm"
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              Actualizar Datos
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full cursor-pointer"
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Exportar Reporte
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="cursor-pointer">
                  Descargar como PDF
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  Descargar como CSV
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  Enviar por Email
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
