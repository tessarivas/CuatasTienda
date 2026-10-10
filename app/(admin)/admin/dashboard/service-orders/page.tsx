"use client";

import * as React from "react";
import { ClipboardList, Clock, HandCoins, Loader2, Plus, Search, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DashboardContext } from "../layout";
import { StatCard, STAT_ROW } from "../_components/stat-card";
import { cn } from "@/lib/utils";
import { OrderFormModal } from "./_components/order-form-modal";
import { OrderDetailModal } from "./_components/order-detail-modal";
import {
  type ApiServiceOrder,
  type OrderStatus,
  STATUS_LABEL,
  STATUS_TAG,
  orderRest,
  orderTotal,
  supplierName,
} from "./service-order-utils";

type Filter = OrderStatus | "todos";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "PorEntregar", label: "Por entregar" },
  { value: "Entregado", label: "Entregados" },
  { value: "Cancelado", label: "Cancelados" },
  { value: "todos", label: "Todos" },
];

const money = (n: number) =>
  `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "2-digit" });

// Pedidos de servicio (#37): servicios por pedido (instalaciones,
// mantenimientos) que se registran con el cliente y se cobran al entregar.
// Los servicios rápidos (copias) se siguen vendiendo en la caja.
export default function ServiceOrdersPage() {
  const { suppliers, products } = React.useContext(DashboardContext);
  const [orders, setOrders] = React.useState<ApiServiceOrder[] | null>(null);
  const [filter, setFilter] = React.useState<Filter>("PorEntregar");
  const [search, setSearch] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ApiServiceOrder | null>(null);
  const [selected, setSelected] = React.useState<ApiServiceOrder | null>(null);
  // Servicio con el que llega "Registrar" desde el inventario.
  const [initialServiceId, setInitialServiceId] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/service-orders")
      .then((res) => (res.ok ? res.json() : []))
      .then(setOrders)
      .catch(() => setOrders([]));
    // "Nuevo pedido" desde el botón de la pestaña Servicios del inventario.
    const params = new URLSearchParams(window.location.search);
    if (params.get("nuevo") === "1") {
      setInitialServiceId(params.get("servicio"));
      setFormOpen(true);
    }
  }, []);

  const list = orders ?? [];
  const pending = list.filter((o) => o.status === "PorEntregar");
  const now = new Date();
  const deliveredThisMonth = list.filter((o) => {
    if (o.status !== "Entregado" || !o.deliveredAt) return false;
    const d = new Date(o.deliveredAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });

  const term = search.trim().toLowerCase();
  const visible = list.filter(
    (o) =>
      (filter === "todos" || o.status === filter) &&
      (!term ||
        o.folio.toLowerCase().includes(term) ||
        o.customerName.toLowerCase().includes(term) ||
        (o.customerPhone ?? "").includes(term))
  );

  // Reemplaza (o agrega al principio) el pedido que cambió.
  const upsert = (order: ApiServiceOrder) =>
    setOrders((prev) => {
      const current = prev ?? [];
      return current.some((o) => o.id === order.id)
        ? current.map((o) => (o.id === order.id ? order : o))
        : [order, ...current];
    });

  const isLoading = orders === null;

  return (
    <>
      <div className="space-y-4 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:gap-4">
          <h1 className="text-2xl font-bold">Pedidos de servicio</h1>
          <div className="mt-4 flex items-center gap-2 md:mt-0 md:ml-auto">
            <div className="relative grow">
              <Input
                placeholder="Buscar folio, nombre o teléfono..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-lg pl-10"
              />
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
            <Button
              className="cursor-pointer"
              onClick={() => {
                setEditing(null);
                setInitialServiceId(null);
                setFormOpen(true);
              }}
            >
              <Plus />
              Nuevo pedido
            </Button>
          </div>
        </div>

        <div className={STAT_ROW}>
          <StatCard
            color="yellow"
            icon={Clock}
            title="Por entregar"
            value={pending.length}
            hint="Esperan que los recojan"
            loading={isLoading}
          />
          <StatCard
            color="blue"
            icon={Wallet}
            title="Por cobrar"
            value={money(pending.reduce((sum, o) => sum + orderRest(o), 0))}
            hint="Lo que falta, sin los anticipos"
            loading={isLoading}
          />
          <StatCard
            color="pink"
            icon={HandCoins}
            title="Entregados este mes"
            value={deliveredThisMonth.length}
            hint={`${money(deliveredThisMonth.reduce((sum, o) => sum + orderTotal(o), 0))} cobrados`}
            loading={isLoading}
          />
        </div>

        {/* Filtro por estado: pestañas sencillas. */}
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={filter === f.value ? "default" : "outline"}
              size="sm"
              className="cursor-pointer rounded-full"
              onClick={() => setFilter(f.value)}
            >
              {f.label}
              {f.value === "PorEntregar" && pending.length > 0 && ` (${pending.length})`}
            </Button>
          ))}
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[48rem] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Folio</th>
                <th className="px-2 py-2.5 font-medium">Fecha</th>
                <th className="px-2 py-2.5 font-medium">Cliente</th>
                <th className="px-2 py-2.5 font-medium">Teléfono</th>
                <th className="px-2 py-2.5 font-medium">Proveedor</th>
                <th className="px-2 py-2.5 text-center font-medium">Servicios</th>
                <th className="px-2 py-2.5 text-right font-medium">Total</th>
                <th className="px-2 py-2.5 text-right font-medium">Resta</th>
                <th className="px-4 py-2.5 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="h-24">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Cargando pedidos...
                    </div>
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12">
                    <div className="flex flex-col items-center text-center">
                      <div className="mb-4 rounded-full bg-muted p-6">
                        <ClipboardList className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <p className="font-medium text-muted-foreground">
                        {list.length === 0
                          ? "Todavía no hay pedidos de servicio"
                          : "Ningún pedido coincide"}
                      </p>
                      {list.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          Usa &quot;Nuevo pedido&quot; para registrar uno
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                visible.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => setSelected(o)}
                    className="cursor-pointer border-b last:border-b-0 hover:bg-muted/50"
                  >
                    <td className="px-4 py-2.5 font-mono">{o.folio}</td>
                    <td className="whitespace-nowrap px-2 py-2.5">{shortDate(o.createdAt)}</td>
                    <td className="px-2 py-2.5 font-medium">{o.customerName}</td>
                    <td className="px-2 py-2.5 text-muted-foreground">{o.customerPhone ?? ""}</td>
                    <td className="px-2 py-2.5">{supplierName(o)}</td>
                    <td className="px-2 py-2.5 text-center tabular-nums">
                      {o.ServiceOrderItem.reduce((sum, i) => sum + i.quantity, 0)}
                    </td>
                    <td className="px-2 py-2.5 text-right font-semibold tabular-nums">
                      {money(orderTotal(o))}
                    </td>
                    {/* Lo que falta por pagar; sólo cuenta mientras está por entregar. */}
                    <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground">
                      {o.status === "PorEntregar" ? money(orderRest(o)) : ""}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", STATUS_TAG[o.status])}>
                        {STATUS_LABEL[o.status]}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <OrderFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        suppliers={suppliers}
        products={products}
        order={editing}
        initialServiceId={initialServiceId}
        onSaved={(order) => {
          upsert(order);
          setFormOpen(false);
          // Al guardar se abre el pedido para imprimirlo de una vez.
          setSelected(order);
        }}
      />
      <OrderDetailModal
        order={selected}
        onClose={() => setSelected(null)}
        onEdit={(order) => {
          setSelected(null);
          setEditing(order);
          setFormOpen(true);
        }}
        onChanged={(order) => {
          upsert(order);
          setSelected(order);
        }}
      />
    </>
  );
}
