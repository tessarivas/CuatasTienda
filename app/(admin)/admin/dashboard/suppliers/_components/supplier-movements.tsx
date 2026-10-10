"use client";

import * as React from "react";
import { History, Loader2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

// Forma de GET /api/suppliers/[id]/movements.
type Movement = {
  key: string;
  type: "alta" | "retiro" | "venta";
  date: string;
  productId: number;
  product: string;
  retired: boolean;
  quantity: number;
  detail: string | null;
  folio: string | null;
  amount: number | null;
  user: string | null;
};
type MovementsData = {
  products: { id: number; title: string; retired: boolean }[];
  movements: Movement[];
};

type TypeFilter = "todos" | Movement["type"];

// Mismos tonos que la Actividad reciente del inicio: alta azul, retiro rojo,
// venta amarillo. Etiqueta = fondo -light + texto -dark.
const KIND = {
  alta: { label: "Alta", tag: "bg-my-blue-light text-my-blue-dark", qty: "text-my-blue-dark", sign: "+" },
  retiro: { label: "Retiro", tag: "bg-my-red-light text-my-red-dark", qty: "text-my-red-dark", sign: "−" },
  venta: { label: "Venta", tag: "bg-my-yellow-light text-my-yellow-dark", qty: "text-foreground", sign: "−" },
} as const;

const money = (n: number) =>
  `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Día local (el de la tienda) de un instante, como el valor de un
// <input type="date">.
const toDateInput = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });

// Historial de movimientos del proveedor (#16): altas, retiros y ventas de
// todos sus productos, incluidos los retirados. Va debajo de Corte Mensual y
// Productos. `refreshKey` cambia cuando el padre recarga al proveedor (p. ej.
// después de agregar unidades), para volver a pedir el historial.
export function SupplierMovements({
  supplierId,
  refreshKey,
}: {
  supplierId: string;
  refreshKey: unknown;
}) {
  const [data, setData] = React.useState<MovementsData | null>(null);
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>("todos");
  const [productFilter, setProductFilter] = React.useState("todos");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/suppliers/${supplierId}/movements`);
        if (!res.ok) {
          const { error: message } = await res.json();
          throw new Error(message);
        }
        const json: MovementsData = await res.json();
        if (!cancelled) setData(json);
      } catch (err) {
        if (cancelled) return;
        toast.error((err as Error).message || "No se pudo cargar el historial");
        setData({ products: [], movements: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supplierId, refreshKey]);

  const rows = (data?.movements ?? []).filter((m) => {
    if (typeFilter !== "todos" && m.type !== typeFilter) return false;
    if (productFilter !== "todos" && String(m.productId) !== productFilter) return false;
    const day = toDateInput(m.date);
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
  });
  const hasFilters = typeFilter !== "todos" || productFilter !== "todos" || !!from || !!to;

  const totals = rows.reduce(
    (acc, m) => {
      acc[m.type] += m.quantity;
      if (m.type === "venta") acc.amount += m.amount ?? 0;
      return acc;
    },
    { alta: 0, retiro: 0, venta: 0, amount: 0 }
  );

  const clearFilters = () => {
    setTypeFilter("todos");
    setProductFilter("todos");
    setFrom("");
    setTo("");
  };

  return (
    <Card className="gap-4">
      {/* grid-cols-1: CardHeader es una rejilla con columna automática que
          crece al ancho de su contenido; con los filtros en celular se salía
          de la tarjeta y empujaba la página de lado. */}
      <CardHeader className="grid-cols-1">
        {/* En columna hasta md: como fila con flex-wrap, el grupo de filtros
            medía lo que todos juntos en una línea y empujaba la página de
            lado. */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5" />
            <CardTitle className="text-lg">Historial de Movimientos</CardTitle>
            {data && <Badge variant="secondary">{rows.length}</Badge>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
              <SelectTrigger className="w-full cursor-pointer sm:w-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los tipos</SelectItem>
                <SelectItem value="alta">Altas</SelectItem>
                <SelectItem value="retiro">Retiros</SelectItem>
                <SelectItem value="venta">Ventas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger className="w-full cursor-pointer sm:w-56 [&>span]:truncate">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los productos</SelectItem>
                {data?.products.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.title}
                    {p.retired ? " (retirado)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Las dos fechas siempre juntas; en celular ocupan una fila
                completa y se reparten el ancho. */}
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="min-w-0 flex-1 sm:w-40 sm:flex-none"
                aria-label="Desde"
              />
              <span className="text-sm text-muted-foreground">a</span>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="min-w-0 flex-1 sm:w-40 sm:flex-none"
                aria-label="Hasta"
              />
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" className="w-full cursor-pointer sm:w-auto" onClick={clearFilters}>
                <X />
                Limpiar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!data ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="mb-3 rounded-full bg-muted p-5">
              <History className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              {data.movements.length === 0
                ? "Todavía no hay movimientos de este proveedor"
                : "Ningún movimiento coincide con los filtros"}
            </p>
          </div>
        ) : (
          <>
            {/* Tabla propia (no la de shadcn): su contenedor con
                overflow-x rompe el encabezado sticky al hacer scroll.
                table-fixed + anchos por columna: con ancho automático la
                columna Detalle crecía más que la tarjeta (truncate no
                aplica) y salía una barra de scroll horizontal. Producto y
                Detalle se reparten lo que sobra y se cortan con "…". */}
            <div className="max-h-[28rem] overflow-auto rounded-lg border">
              <table className="w-full min-w-[48rem] table-fixed text-sm">
                <thead className="sticky top-0 z-10 bg-card shadow-[inset_0_-1px_0_var(--border)]">
                  <tr className="text-left text-muted-foreground">
                    <th className="w-40 px-4 py-2.5 font-medium">Fecha</th>
                    <th className="px-2 py-2.5 font-medium">Producto</th>
                    <th className="w-28 px-2 py-2.5 font-medium">Movimiento</th>
                    <th className="w-24 px-2 py-2.5 text-center font-medium">Cantidad</th>
                    <th className="px-2 py-2.5 font-medium">Detalle</th>
                    <th className="w-28 px-2 py-2.5 text-right font-medium">Monto</th>
                    <th className="w-28 px-4 py-2.5 font-medium">Registró</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((m) => {
                    const kind = KIND[m.type];
                    return (
                      <tr key={m.key} className="border-t">
                        <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                          {formatDate(m.date)}
                        </td>
                        <td className="px-2 py-2.5">
                          <p className="truncate font-medium" title={m.product}>
                            {m.product}
                          </p>
                          {m.retired && <p className="text-xs text-muted-foreground">Retirado</p>}
                        </td>
                        <td className="px-2 py-2.5">
                          <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", kind.tag)}>
                            {kind.label}
                          </span>
                        </td>
                        <td className={cn("px-2 py-2.5 text-center font-semibold tabular-nums", kind.qty)}>
                          {kind.sign}
                          {m.quantity}
                        </td>
                        <td className="px-2 py-2.5 text-muted-foreground">
                          <p className="truncate" title={m.detail ?? undefined}>
                            {m.folio && <span className="mr-1 font-mono text-foreground">{m.folio}</span>}
                            {m.detail}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-2 py-2.5 text-right font-semibold tabular-nums">
                          {m.amount !== null ? money(m.amount) : ""}
                        </td>
                        <td className="truncate px-4 py-2.5 text-muted-foreground">
                          {m.user ?? ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Resumen de lo filtrado; leyenda en gris. */}
            <p className="mt-3 text-xs text-muted-foreground">
              {totals.alta} {totals.alta === 1 ? "pieza dada de alta" : "piezas dadas de alta"} ·{" "}
              {totals.retiro} {totals.retiro === 1 ? "retirada" : "retiradas"} · {totals.venta}{" "}
              {totals.venta === 1 ? "vendida" : "vendidas"} por {money(totals.amount)}. Las altas
              iniciales se calculan con lo que hay hoy más lo vendido y retirado.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
