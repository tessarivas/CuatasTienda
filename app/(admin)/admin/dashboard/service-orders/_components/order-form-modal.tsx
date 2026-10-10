"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Ban, ClipboardList, Loader2, Plus, X } from "lucide-react";
import { type Product, type Supplier } from "@/lib/data";
import { toast } from "@/lib/toast";
import { type ApiServiceOrder, orderPaid } from "../service-order-utils";

type Method = "Efectivo" | "Tarjeta" | "Transferencia";

type Row = { key: number; productId: string; description: string; quantity: string; price: string };

const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;
let nextKey = 1;
const emptyRow = (): Row => ({ key: nextKey++, productId: "", description: "", quantity: "1", price: "" });

const money = (n: number) =>
  `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface OrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  products: Product[];
  // Con pedido: se edita (sólo si está "Por entregar"); sin él, uno nuevo.
  order?: ApiServiceOrder | null;
  // Pedido nuevo desde "Registrar" del inventario: ese servicio ya puesto.
  initialServiceId?: string | null;
  onSaved: (order: ApiServiceOrder) => void;
}

// "Nuevo pedido" / "Editar pedido" de servicio: proveedor, cliente y los
// servicios del pedido (cada uno con lo que se va a hacer, cantidad y
// precio de esta vez). Todo el pedido es de un proveedor.
export function OrderFormModal({
  isOpen,
  onClose,
  suppliers,
  products,
  order,
  initialServiceId,
  onSaved,
}: OrderFormModalProps) {
  const isEdit = !!order;
  const [supplierId, setSupplierId] = React.useState("");
  const [customerName, setCustomerName] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");
  const [rows, setRows] = React.useState<Row[]>([emptyRow()]);
  const [isSaving, setIsSaving] = React.useState(false);
  const [confirmCancel, setConfirmCancel] = React.useState(false);
  // Anticipo opcional al crear el pedido.
  const [deposit, setDeposit] = React.useState("");
  const [depositMethod, setDepositMethod] = React.useState<Method>("Efectivo");
  // Al cancelar con anticipo: devolverlo (y cómo) o que se quede la tienda.
  const [depositChoice, setDepositChoice] = React.useState<"devolver" | "quedar">("devolver");
  const [refundMethod, setRefundMethod] = React.useState<Method>("Efectivo");

  React.useEffect(() => {
    if (!isOpen) return;
    setDeposit("");
    setDepositMethod("Efectivo");
    setDepositChoice("devolver");
    setRefundMethod("Efectivo");
    if (order) {
      setSupplierId(String(order.Supplier.id));
      setCustomerName(order.customerName);
      setCustomerPhone(order.customerPhone ?? "");
      setRows(
        order.ServiceOrderItem.map((i) => ({
          key: nextKey++,
          productId: String(i.productId),
          description: i.description,
          quantity: String(i.quantity),
          price: String(Number(i.price)),
        }))
      );
    } else {
      const initial = initialServiceId ? products.find((p) => p.id === initialServiceId) : undefined;
      setSupplierId(initial?.supplierId ?? "");
      setCustomerName("");
      setCustomerPhone("");
      setRows([
        initial
          ? { ...emptyRow(), productId: initial.id, description: initial.title, price: String(initial.price) }
          : emptyRow(),
      ]);
    }
    // products no va en las dependencias: si se recarga mientras el modal
    // está abierto, no se debe borrar lo que ya se capturó.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, order, initialServiceId]);

  // Sólo los servicios marcados "Se hace por pedido" (así no estorban los
  // rápidos como las copias, que se venden en la caja). Los que ya están en
  // el pedido siempre aparecen (p. ej. uno que llegó desde "Registrar" o un
  // pedido viejo, aunque no estén marcados).
  const isOrderService = (p: Product) =>
    p.type === "SERVICE" && p.status !== "Retirado" && !!p.byOrder;
  const services = products.filter(
    (p) =>
      p.type === "SERVICE" &&
      p.status !== "Retirado" &&
      p.supplierId === supplierId &&
      (p.byOrder || rows.some((r) => r.productId === p.id))
  );
  // Sólo proveedores con al menos un servicio por pedido (y el ya elegido).
  const suppliersWithServices = suppliers.filter(
    (s) =>
      String(s.id) === supplierId ||
      products.some((p) => isOrderService(p) && p.supplierId === String(s.id))
  );

  const updateRow = (key: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const chooseService = (row: Row, productId: string) => {
    const product = services.find((p) => p.id === productId);
    const previous = services.find((p) => p.id === row.productId);
    updateRow(row.key, {
      productId,
      // Propone el nombre y precio del catálogo; si ya se escribió otra
      // descripción, se respeta.
      description: !row.description || row.description === previous?.title ? product?.title ?? "" : row.description,
      price: row.price && row.productId ? row.price : product ? String(product.price) : "",
    });
  };

  const rowTotal = (r: Row) =>
    MONEY_PATTERN.test(r.price.trim()) && Number(r.quantity) > 0 ? Number(r.price) * Number(r.quantity) : 0;
  const total = rows.reduce((sum, r) => sum + rowTotal(r), 0);
  // Lo que ya pagó (al editar) y el anticipo que se escribe al crear.
  const alreadyPaid = order ? orderPaid(order) : 0;
  const fullyPaid = !!order?.Sale;
  const depositValue = Number(deposit);
  const hasDeposit = !isEdit && deposit.trim() !== "";
  const depositValid = !hasDeposit || (MONEY_PATTERN.test(deposit.trim()) && depositValue > 0);

  const handleSave = async () => {
    if (isSaving) return;
    if (!supplierId) return toast.warning("Elige el proveedor del servicio.");
    if (!customerName.trim()) return toast.warning("Escribe el nombre del cliente.");
    for (const r of rows) {
      if (!r.productId) return toast.warning("Elige el servicio de cada renglón.");
      if (!r.description.trim()) return toast.warning("Escribe qué se va a hacer en cada servicio.");
      if (!(Number.isInteger(Number(r.quantity)) && Number(r.quantity) > 0)) {
        return toast.warning("La cantidad debe ser 1 o más.");
      }
      if (!MONEY_PATTERN.test(r.price.trim())) return toast.warning("Revisa el precio de cada servicio.");
    }
    if (!depositValid) return toast.warning("Revisa el monto del anticipo.");
    if (hasDeposit && depositValue > total) {
      return toast.warning("El anticipo no puede ser mayor al total.");
    }

    setIsSaving(true);
    try {
      const body = {
        supplierId: Number(supplierId),
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || null,
        items: rows.map((r) => ({
          productId: Number(r.productId),
          description: r.description.trim(),
          quantity: Number(r.quantity),
          price: r.price.trim(),
        })),
        deposit: hasDeposit ? { amount: depositValue.toFixed(2), method: depositMethod } : null,
      };
      const res = await fetch(isEdit ? `/api/service-orders/${order!.id}` : "/api/service-orders", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const { error: message } = await res.json();
        toast.error(message ?? "No se pudo guardar el pedido");
        return;
      }
      const saved: ApiServiceOrder = await res.json();
      toast.success(isEdit ? "Pedido actualizado" : `Pedido ${saved.folio} guardado`);
      onSaved(saved);
    } catch {
      toast.error("No se pudo guardar el pedido");
    } finally {
      setIsSaving(false);
    }
  };

  // "Cancelar pedido": el cliente ya no va a recoger. No se cobra nada.
  const handleCancelOrder = async () => {
    if (!order || isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/service-orders/${order.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          alreadyPaid > 0 ? { deposit: depositChoice, refundMethod } : {}
        ),
      });
      if (!res.ok) {
        const { error: message } = await res.json();
        toast.error(message ?? "No se pudo cancelar el pedido");
        return;
      }
      const updated: ApiServiceOrder = await res.json();
      toast.success(`Pedido ${order.folio} cancelado`);
      setConfirmCancel(false);
      onSaved(updated);
    } catch {
      toast.error("No se pudo cancelar el pedido");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={() => !isSaving && onClose()}>
      {/* En celular todo el modal se desliza junto (una sola barra); en
          computadora sólo la parte de en medio, con total y botones fijos. */}
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-h-none sm:max-w-2xl sm:overflow-visible">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            {isEdit ? `Editar pedido ${order!.folio}` : "Nuevo pedido de servicio"}
          </DialogTitle>
          <DialogDescription>
            El cliente paga cuando recoge. Mientras tanto queda por entregar.
          </DialogDescription>
        </DialogHeader>

        {/* grid-cols-1: sin él, la columna crece al texto más largo (p. ej.
            el servicio elegido) y el modal se sale de lado en celular. */}
        <div className="grid min-w-0 grid-cols-1 gap-4 py-2 sm:max-h-[65vh] sm:overflow-y-auto sm:pr-1">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="order-supplier">Proveedor</Label>
              <Select
                value={supplierId}
                onValueChange={(v) => {
                  setSupplierId(v);
                  setRows([emptyRow()]);
                }}
                disabled={isEdit}
              >
                <SelectTrigger id="order-supplier" className="w-full cursor-pointer">
                  <SelectValue placeholder="Elige el proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {suppliersWithServices.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.businessName || s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {suppliersWithServices.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Ningún servicio está marcado &quot;Se hace por pedido&quot;. Márcalo al editar el servicio en Inventario.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="order-name">Nombre del cliente</Label>
              <Input id="order-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="order-phone">Teléfono</Label>
              <Input
                id="order-phone"
                inputMode="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Servicios del pedido</p>
            {rows.map((r, idx) => (
              <div key={r.key} className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 shrink-0 text-sm text-muted-foreground">{idx + 1}.</span>
                  <Select value={r.productId} onValueChange={(v) => chooseService(r, v)} disabled={!supplierId}>
                    <SelectTrigger className="min-w-0 flex-1 cursor-pointer">
                      <SelectValue placeholder={supplierId ? "Elige el servicio" : "Primero elige el proveedor"} />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.title} · {money(p.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {rows.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 cursor-pointer text-muted-foreground"
                      aria-label="Quitar este servicio"
                      onClick={() => setRows((prev) => prev.filter((x) => x.key !== r.key))}
                    >
                      <X />
                    </Button>
                  )}
                </div>
                {/* Este texto es el que sale en el ticket y en la nota, por
                    eso se dice en el nombre del campo. */}
                <div className="space-y-1">
                  <Label htmlFor={`order-desc-${r.key}`} className="text-xs text-muted-foreground">
                    Lo que dirá el ticket
                  </Label>
                  <Input
                    id={`order-desc-${r.key}`}
                    placeholder="Qué se va a hacer (p. ej. Mantenimiento laptop HP)"
                    value={r.description}
                    onChange={(e) => updateRow(r.key, { description: e.target.value })}
                  />
                </div>
                {/* Cantidad y precio con su nombre arriba, y el importe del
                    renglón a la derecha: cabe igual en celular y en
                    computadora. */}
                <div className="grid grid-cols-[4.5rem_minmax(0,8rem)_minmax(0,1fr)] items-end gap-2 text-sm">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Cantidad</Label>
                    <Input
                      inputMode="numeric"
                      value={r.quantity}
                      onChange={(e) => updateRow(r.key, { quantity: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Precio</Label>
                    <Input
                      inputMode="decimal"
                      placeholder="0.00"
                      value={r.price}
                      onChange={(e) => updateRow(r.key, { price: e.target.value })}
                    />
                  </div>
                  <span className="truncate pb-2 text-right font-semibold tabular-nums">{money(rowTotal(r))}</span>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              className="w-full cursor-pointer"
              disabled={!supplierId}
              onClick={() => setRows((prev) => [...prev, emptyRow()])}
            >
              <Plus />
              Agregar otro servicio
            </Button>
          </div>
        </div>

        <div className="space-y-2 border-t pt-3">
          <div className="flex items-center justify-between text-base font-bold">
            <span>Total</span>
            <span className="tabular-nums">{money(total)}</span>
          </div>
          {/* Al crear: anticipo opcional (parcial o completo). */}
          {!isEdit && (
            // En celular: el nombre arriba y monto | forma de pago a la mitad
            // cada uno; en computadora, todo en un renglón.
            <div className="grid grid-cols-2 items-center gap-2 text-sm sm:flex sm:flex-wrap">
              <Label htmlFor="order-deposit" className="col-span-2 text-muted-foreground">
                Anticipo (opcional)
              </Label>
              <Input
                id="order-deposit"
                inputMode="decimal"
                placeholder="0.00"
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
                className="w-full sm:w-28"
              />
              <Select value={depositMethod} onValueChange={(v) => setDepositMethod(v as Method)}>
                <SelectTrigger className="w-full cursor-pointer sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Efectivo">Efectivo</SelectItem>
                  <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="Transferencia">Transferencia</SelectItem>
                </SelectContent>
              </Select>
              {hasDeposit && depositValid && depositValue <= total && (
                <span className="col-span-2 text-muted-foreground sm:ml-auto">
                  Resta al recoger {money(total - depositValue)}
                </span>
              )}
            </div>
          )}
          {isEdit && alreadyPaid > 0 && (
            <p className="text-xs text-muted-foreground">
              Ya dejó {money(alreadyPaid)} de anticipo. El total no puede quedar abajo de eso.
            </p>
          )}
        </div>

        {/* En celular Cancelar | Guardar en un renglón; "Cancelar pedido"
            arriba, a todo lo ancho. */}
        <DialogFooter className="grid grid-cols-2 sm:flex">
          {isEdit && !fullyPaid && (
            <Button
              variant="ghost"
              onClick={() => setConfirmCancel(true)}
              disabled={isSaving}
              className="col-span-2 cursor-pointer text-muted-foreground sm:mr-auto"
            >
              <Ban />
              Cancelar pedido
            </Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={isSaving} className="cursor-pointer">
            {isEdit ? "Cerrar" : "Cancelar"}
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="cursor-pointer">
            {isSaving && <Loader2 className="animate-spin" />}
            {isEdit ? "Guardar cambios" : "Guardar pedido"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={confirmCancel} onOpenChange={(o) => !isSaving && setConfirmCancel(o)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Cancelar el pedido {order?.folio}?</AlertDialogTitle>
          <AlertDialogDescription>
            Úsalo si el cliente ya no va a recoger. El pedido queda como cancelado.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {/* Con anticipo se pregunta cada vez qué pasa con ese dinero. */}
        {alreadyPaid > 0 && (
          <div className="space-y-2 rounded-lg border p-3 text-sm">
            <p>
              Dejó <span className="font-semibold">{money(alreadyPaid)}</span> de anticipo. ¿Qué hacemos con ese dinero?
            </p>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="deposit-choice"
                checked={depositChoice === "devolver"}
                onChange={() => setDepositChoice("devolver")}
                className="cursor-pointer accent-foreground"
              />
              Se le devuelve al cliente
            </label>
            {depositChoice === "devolver" && (
              <div className="pl-6">
                <Select value={refundMethod} onValueChange={(v) => setRefundMethod(v as Method)}>
                  <SelectTrigger className="w-full cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Efectivo">En efectivo (sale de la caja)</SelectItem>
                    <SelectItem value="Transferencia">Por transferencia</SelectItem>
                    <SelectItem value="Tarjeta">A la tarjeta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="deposit-choice"
                checked={depositChoice === "quedar"}
                onChange={() => setDepositChoice("quedar")}
                className="cursor-pointer accent-foreground"
              />
              Se queda la tienda con el anticipo
            </label>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel className="cursor-pointer" disabled={isSaving}>
            Regresar
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleCancelOrder} disabled={isSaving} className="cursor-pointer">
            {isSaving ? <Loader2 className="animate-spin" /> : <Ban />}
            Cancelar pedido
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
