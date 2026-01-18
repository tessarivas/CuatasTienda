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
import { BarChart, FileDown, Calendar as CalendarIcon } from "lucide-react";
import { type Supplier } from "@/lib/data";
import { cn } from "@/lib/utils";

interface MonthlyCutoffProps {
  supplier: Supplier;
}

export function MonthlyCutoff({ supplier }: MonthlyCutoffProps) {
  const [startDate, setStartDate] = React.useState<Date | undefined>();
  const [endDate, setEndDate] = React.useState<Date | undefined>();

  // Simulación de métricas de ventas
  const totalSold = 15200.5;
  const productsSoldCount = 89;
  const estimatedProfit = totalSold * 0.3; // Suponiendo un 30% de ganancia

  const handleGenerateReport = () => {
    // Ahora trabajas con objetos Date, lo que facilita la lógica de filtrado
    console.log(
      `Generando reporte para ${supplier.businessName} de ${startDate} a ${endDate}`
    );
    // Por ahora, solo mostramos los datos simulados.
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generar Corte Mensual</CardTitle>
        <CardDescription>
          Filtra las ventas y exporta el reporte. El día de corte de este
          proveedor es el{" "}
          <span className="font-bold text-primary">{supplier.cutoffDay}</span>{" "}
          de cada mes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sección de Métricas Visuales */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">
                Total Vendido
              </CardTitle>
              <span className="text-muted-foreground">$</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${totalSold.toLocaleString("es-MX")}
              </div>
              <p className="text-xs text-muted-foreground">
                en el periodo seleccionado
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Productos Vendidos
              </CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{productsSoldCount}</div>
              <p className="text-xs text-muted-foreground">unidades vendidas</p>
            </CardContent>
          </Card>
        </div>

        {/* Sección de Filtros por Fecha con shadcn/ui Calendar */}
        <div className="flex flex-col sm:flex-row items-end gap-4 p-4 border rounded-lg">
          <div className="grid w-full gap-2">
            <Label htmlFor="startDate">Fecha de Inicio</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal cursor-pointer",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? (
                    format(startDate, "PPP", { locale: es })
                  ) : (
                    <span>Seleccionar</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                  locale={es}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid w-full gap-2">
            <Label htmlFor="endDate">Fecha de Fin</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal cursor-pointer",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? (
                    format(endDate, "PPP", { locale: es })
                  ) : (
                    <span>Seleccionar</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
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

        {/* Botones de Acción */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={handleGenerateReport}
            className="w-full sm:w-auto cursor-pointer"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            Actualizar Ventas
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="cursor-pointer">
                <FileDown className="mr-2 h-4 w-4" />
                Exportar Reporte
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Descargar como PDF</DropdownMenuItem>
              <DropdownMenuItem>Descargar como CSV</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
