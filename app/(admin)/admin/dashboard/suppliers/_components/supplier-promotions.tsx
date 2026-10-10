"use client";

import * as React from "react";
import Image from "next/image";
import { Ban, Check, Loader2, Package, Plus, Search, Tag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { type PromotionType, promoLabel, promoUnitDiscount } from "@/lib/promotions";
import { CardActionButton } from "./card-action-button";

// Forma de GET /api/suppliers/[id]/promotions.
type Promotion = {
  id: number;
  name: string | null;
  type: PromotionType;
  value: number;
  startsOn: string;
  endsOn: string;
  cancelledAt: string | null;
  createdBy: string;
  salesCount: number;
  allProducts: boolean;
  products: { id: number; title: string }[];
};

// Productos del proveedor que se pueden elegir (sin retirados).
type PickableProduct = {
  id: number;
  title: string;
  price: number;
  picture: string | null;
  type: "PRODUCT" | "SERVICE";
};

type State = "Vigente" | "Programada" | "Terminó" | "Cancelada";

// Etiqueta = fondo -light + texto -dark; lo que ya no aplica, en gris.
const STATE_TAG: Record<State, string> = {
  Vigente: "bg-my-green-light text-my-green-dark",
  Programada: "bg-my-blue-light text-my-blue-dark",
  Terminó: "bg-muted text-muted-foreground",
  Cancelada: "bg-muted text-muted-foreground",
};

// Día local (el de la tienda) como "YYYY-MM-DD".
const localYmd = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const shortDay = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
};

const stateOf = (p: Promotion, today: string): State =>
  p.cancelledAt ? "Cancelada" : p.endsOn < today ? "Terminó" : p.startsOn > today ? "Programada" : "Vigente";

const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;

// Promociones del proveedor (#34): descuento a todos sus productos o sólo a
// algunos, durante unos días. La caja la aplica sola. Un producto no puede
// estar en dos promociones a la vez.
export function SupplierPromotions({
  supplierId,
  products,
}: {
  supplierId: string;
  products: PickableProduct[];
}) {
  const [promotions, setPromotions] = React.useState<Promotion[] | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [toCancel, setToCancel] = React.useState<Promotion | null>(null);
  const [isCancelling, setIsCancelling] = React.useState(false);
  const today = localYmd();

  const load = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/suppliers/${supplierId}/promotions`);
      setPromotions(res.ok ? await res.json() : []);
    } catch {
      setPromotions([]);
    }
  }, [supplierId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleCancel = async () => {
    if (!toCancel || isCancelling) return;
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/promotions/${toCancel.id}/cancel`, { method: "POST" });
      if (!res.ok) {
        const { error: message } = await res.json();
        toast.error(message ?? "No se pudo cancelar la promoción");
        return;
      }
      toast.success("Promoción cancelada");
      setToCancel(null);
      load();
    } catch {
      toast.error("No se pudo cancelar la promoción");
    } finally {
      setIsCancelling(false);
    }
  };

  // Vigentes y programadas primero; luego lo pasado.
  const list = [...(promotions ?? [])].sort((a, b) => {
    const rank = (p: Promotion) => ({ Vigente: 0, Programada: 1, Terminó: 2, Cancelada: 3 })[stateOf(p, today)];
    return rank(a) - rank(b) || b.startsOn.localeCompare(a.startsOn);
  });

  return (
    <>
      <Card className="gap-4">
        <CardHeader className="grid-cols-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              <CardTitle className="text-lg">Promociones</CardTitle>
              {promotions && promotions.length > 0 && <Badge variant="secondary">{promotions.length}</Badge>}
            </div>
            <CardActionButton onClick={() => setFormOpen(true)}>
              <Plus />
              Nueva promoción
            </CardActionButton>
          </div>
          <p className="text-sm text-muted-foreground">
            Un descuento para sus productos (todos o algunos) durante unos días. La caja lo aplica sola.
          </p>
        </CardHeader>
        <CardContent>
          {!promotions ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="mb-3 rounded-full bg-muted p-4">
                <Tag className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Este proveedor no tiene promociones</p>
            </div>
          ) : (
            <div className="divide-y">
              {list.map((p) => {
                const state = stateOf(p, today);
                const canCancel = state === "Vigente" || state === "Programada";
                return (
                  <div key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                    <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", STATE_TAG[state])}>
                      {state}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {p.name ? `${p.name} · ` : ""}
                        {promoLabel(p)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <span title={p.allProducts ? undefined : p.products.map((x) => x.title).join(", ")}>
                          {p.allProducts
                            ? "Todos los productos"
                            : `${p.products.length} ${p.products.length === 1 ? "producto" : "productos"}`}
                        </span>
                        {" · "}Del {shortDay(p.startsOn)} al {shortDay(p.endsOn)}
                        {p.salesCount > 0 &&
                          ` · usada en ${p.salesCount} ${p.salesCount === 1 ? "venta" : "ventas"}`}
                      </p>
                    </div>
                    {canCancel && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="cursor-pointer text-muted-foreground"
                        onClick={() => setToCancel(p)}
                      >
                        <Ban />
                        {state === "Vigente" ? "Terminar" : "Cancelar"}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <PromotionFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        supplierId={supplierId}
        products={products}
        onSaved={() => {
          setFormOpen(false);
          load();
        }}
      />

      <AlertDialog open={!!toCancel} onOpenChange={(o) => !o && !isCancelling && setToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toCancel && stateOf(toCancel, today) === "Vigente" ? "¿Terminar la promoción hoy?" : "¿Cancelar la promoción?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              La caja deja de aplicarla. Lo que ya se vendió con ella conserva su descuento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer" disabled={isCancelling}>
              Regresar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} disabled={isCancelling} className="cursor-pointer">
              {isCancelling ? <Loader2 className="animate-spin" /> : <Ban />}
              Sí, quitarla
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function PromotionFormModal({
  isOpen,
  onClose,
  supplierId,
  products,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  supplierId: string;
  products: PickableProduct[];
  onSaved: () => void;
}) {
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<PromotionType>("Porcentaje");
  const [value, setValue] = React.useState("");
  const [startsOn, setStartsOn] = React.useState("");
  const [endsOn, setEndsOn] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  // "Todos los productos" o "Sólo algunos" (los marcados).
  const [scope, setScope] = React.useState<"todos" | "algunos">("todos");
  const [selected, setSelected] = React.useState<number[]>([]);
  const [search, setSearch] = React.useState("");
  const [kind, setKind] = React.useState<"todo" | "PRODUCT" | "SERVICE">("todo");

  React.useEffect(() => {
    if (!isOpen) return;
    const now = new Date();
    const inAWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 6);
    setName("");
    setType("Porcentaje");
    setValue("");
    setStartsOn(localYmd(now));
    setEndsOn(localYmd(inAWeek));
    setScope("todos");
    setSelected([]);
    setSearch("");
    setKind("todo");
  }, [isOpen]);

  const numeric = Number(value);
  const valueValid =
    MONEY_PATTERN.test(value.trim()) && numeric > 0 && (type === "CantidadFija" || numeric < 100);
  const datesValid = !!startsOn && !!endsOn && endsOn >= startsOn;
  const hasServices = products.some((p) => p.type === "SERVICE");
  const hasProducts = products.some((p) => p.type !== "SERVICE");

  // Lista visible: búsqueda + productos/servicios, con los marcados primero
  // para que no se pierdan al bajar.
  const term = search.trim().toLowerCase();
  const visible = products
    .filter((p) => p.title.toLowerCase().includes(term))
    .filter((p) => kind === "todo" || (kind === "SERVICE" ? p.type === "SERVICE" : p.type !== "SERVICE"))
    .sort(
      (a, b) =>
        Number(selected.includes(b.id)) - Number(selected.includes(a.id)) ||
        a.title.localeCompare(b.title, "es")
    );

  // Marcar / quitar todos respetan la búsqueda y el filtro.
  const markAll = () => setSelected((prev) => [...new Set([...prev, ...visible.map((p) => p.id)])]);
  const clearAll = () => setSelected((prev) => prev.filter((id) => !visible.some((p) => p.id === id)));

  const promoPrice = (price: number) => price - promoUnitDiscount(price, { type, value: numeric });

  const handleSave = async () => {
    if (isSaving) return;
    if (!valueValid) {
      return toast.warning(
        type === "Porcentaje" ? "Escribe un porcentaje entre 1 y 99." : "Escribe cuántos pesos se descuentan."
      );
    }
    if (!datesValid) return toast.warning("Revisa las fechas: la final no puede ser antes de la inicial.");
    if (scope === "algunos" && selected.length === 0) return toast.warning("Marca al menos un producto.");
    setIsSaving(true);
    try {
      const res = await fetch(`/api/suppliers/${supplierId}/promotions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || null,
          type,
          value: value.trim(),
          startsOn,
          endsOn,
          allProducts: scope === "todos",
          productIds: scope === "algunos" ? selected : [],
        }),
      });
      if (!res.ok) {
        const { error: message } = await res.json();
        toast.error(message ?? "No se pudo guardar la promoción");
        return;
      }
      toast.success("Promoción guardada");
      onSaved();
    } catch {
      toast.error("No se pudo guardar la promoción");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => !isSaving && onClose()}>
      {/* Ancho y en dos columnas: a la izquierda cuánto y cuándo, a la
          derecha qué productos. En celular se apilan. */}
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-h-none sm:max-w-4xl sm:overflow-visible">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Nueva promoción
          </DialogTitle>
          <DialogDescription>
            La caja la aplica sola a los productos que elijas. No aplica a apartados.
          </DialogDescription>
        </DialogHeader>

        {/* En celular sin barra propia: se desliza todo el modal junto. En
            dos columnas, alto fijo (30rem = h-120) para que el modal no cambie de
            tamaño al pasar de "Todos" a "Sólo algunos"; la lista llena lo que
            sobra y se desliza adentro. */}
        <div className="grid grid-cols-1 gap-6 py-2 sm:max-h-[70vh] sm:overflow-y-auto md:h-120 md:max-h-none md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] md:overflow-visible">
          {/* Izquierda: nombre, cómo, cuánto y fechas. */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="promo-name">Nombre (opcional)</Label>
              <Input
                id="promo-name"
                placeholder="Por ejemplo: Buen Fin"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>¿Cómo se descuenta?</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={type === "Porcentaje" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setType("Porcentaje")}
                >
                  Porcentaje
                </Button>
                <Button
                  type="button"
                  variant={type === "CantidadFija" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setType("CantidadFija")}
                >
                  Pesos por pieza
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="promo-value">
                {type === "Porcentaje" ? "Porcentaje de descuento (%)" : "Pesos menos por pieza ($)"}
              </Label>
              <Input
                id="promo-value"
                inputMode="decimal"
                placeholder={type === "Porcentaje" ? "20" : "10.00"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
              {valueValid && (
                <p className="text-xs text-muted-foreground">
                  Un producto de $100.00 quedaría en ${promoPrice(100).toFixed(2)}.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="promo-start">Desde</Label>
                <Input id="promo-start" type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="promo-end">Hasta</Label>
                <Input id="promo-end" type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
              </div>
            </div>
            <p className="-mt-2 text-xs text-muted-foreground">
              Incluye los dos días. Un producto no puede estar en dos promociones a la vez.
            </p>
          </div>

          {/* Derecha: a qué productos. */}
          <div className="flex min-h-0 flex-col gap-2">
            <Label>¿A qué productos?</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={scope === "todos" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setScope("todos")}
              >
                Todos
              </Button>
              <Button
                type="button"
                variant={scope === "algunos" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setScope("algunos")}
              >
                Sólo algunos
              </Button>
            </div>

            {scope === "todos" ? (
              <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed px-4 py-6 text-center sm:py-10">
                <div className="mb-3 rounded-full bg-muted p-4">
                  <Tag className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {products.length === 1
                    ? "Aplica al único producto de este proveedor."
                    : `Aplica a los ${products.length} productos de este proveedor.`}
                </p>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col gap-2 rounded-lg border p-2">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative min-w-40 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {/* Productos / servicios, sólo si el proveedor tiene de los dos. */}
                  {hasProducts && hasServices && (
                    <div className="flex rounded-md border p-0.5 text-xs">
                      {(
                        [
                          ["todo", "Todo"],
                          ["PRODUCT", "Productos"],
                          ["SERVICE", "Servicios"],
                        ] as const
                      ).map(([k, label]) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setKind(k)}
                          className={cn(
                            "cursor-pointer rounded px-2 py-1",
                            kind === k
                              ? "bg-foreground text-background"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 px-1 text-xs">
                  <button type="button" className="cursor-pointer font-medium hover:underline" onClick={markAll}>
                    Marcar todos
                  </button>
                  <button
                    type="button"
                    className="cursor-pointer text-muted-foreground hover:underline"
                    onClick={clearAll}
                  >
                    Quitar todos
                  </button>
                  <span className="ml-auto text-muted-foreground">
                    {selected.length} {selected.length === 1 ? "elegido" : "elegidos"}
                  </span>
                </div>
                <div className="max-h-64 min-h-40 flex-1 space-y-1 overflow-y-auto pr-1 sm:max-h-80 md:max-h-none md:min-h-0">
                  {visible.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">Ningún producto coincide.</p>
                  ) : (
                    visible.map((p) => {
                      const checked = selected.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() =>
                            setSelected((prev) => (checked ? prev.filter((id) => id !== p.id) : [...prev, p.id]))
                          }
                          className={cn(
                            "flex w-full cursor-pointer items-center gap-3 rounded-md border px-2 py-1.5 text-left text-sm transition-colors",
                            checked ? "border-foreground bg-muted" : "border-transparent hover:bg-muted/60"
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                              checked && "border-foreground bg-foreground text-background"
                            )}
                          >
                            {checked && <Check className="h-3 w-3" />}
                          </span>
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded border bg-muted">
                            {p.picture ? (
                              <Image src={p.picture} alt="" width={32} height={32} className="h-full w-full object-cover" />
                            ) : (
                              <Package className="h-4 w-4 text-muted-foreground" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{p.title}</span>
                          {/* Precio, y el de promoción si está marcado. */}
                          <span className="shrink-0 tabular-nums">
                            {checked && valueValid ? (
                              <>
                                <span className="text-muted-foreground line-through">${p.price.toFixed(2)}</span>{" "}
                                <span className="font-semibold text-my-green-dark">
                                  ${promoPrice(p.price).toFixed(2)}
                                </span>
                              </>
                            ) : (
                              <span className="text-muted-foreground">${p.price.toFixed(2)}</span>
                            )}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* En celular Cancelar | Guardar en un renglón. */}
        <DialogFooter className="grid grid-cols-2 sm:flex">
          <Button variant="outline" onClick={onClose} disabled={isSaving} className="cursor-pointer">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="cursor-pointer">
            {isSaving && <Loader2 className="animate-spin" />}
            Guardar promoción
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
