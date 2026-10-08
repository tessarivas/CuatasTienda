"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  ClipboardList,
  FileDown,
  HandCoins,
  Loader2,
  PackageCheck,
  Pencil,
  Printer,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { printTicket } from "@/lib/print-ticket";
import { ServiceOrderTicket, TicketPreview, type TicketServiceOrder } from "../../_components/ticket";
import {
  type ApiServiceOrder,
  STATUS_LABEL,
  STATUS_TAG,
  orderPaid,
  orderRest,
  orderTotal,
  supplierName,
} from "../service-order-utils";

type Method = "Efectivo" | "Tarjeta" | "Transferencia";
const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;

const money = (n: number) =>
  `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Mismos datos para el ticket y para la hoja carta.
const ticketData = (order: ApiServiceOrder): TicketServiceOrder => ({
  folio: order.folio,
  createdAt: order.createdAt,
  customerName: order.customerName,
  customerPhone: order.customerPhone,
  status: order.status,
  supplierName: supplierName(order),
  createdBy: order.User.name,
  items: order.ServiceOrderItem.map((i) => ({
    id: i.id,
    description: i.description,
    quantity: i.quantity,
    price: Number(i.price),
  })),
  sale: order.Sale && {
    folio: order.Sale.folio,
    date: order.Sale.date,
    paymentMethod: order.Sale.paymentMethod,
  },
  payments: order.ServiceOrderPayment.map((p) => ({
    date: p.date,
    amount: Number(p.amount),
    method: p.method,
    kind: p.kind,
  })),
  deliveredAt: order.deliveredAt,
});

function MethodSelect({ value, onChange }: { value: Method; onChange: (m: Method) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Method)}>
      <SelectTrigger className="w-full cursor-pointer">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="Efectivo">Efectivo</SelectItem>
        <SelectItem value="Tarjeta">Tarjeta</SelectItem>
        <SelectItem value="Transferencia">Transferencia</SelectItem>
      </SelectContent>
    </Select>
  );
}

interface OrderDetailModalProps {
  order: ApiServiceOrder | null;
  onClose: () => void;
  onEdit: (order: ApiServiceOrder) => void;
  // El pedido cambió (anticipo, entregado, cancelado): la página lo actualiza.
  onChanged: (order: ApiServiceOrder) => void;
}

// Un pedido de servicio: vista previa del ticket, imprimir / hoja carta, y
// mientras está por entregar: Editar (ahí también se cancela), Anticipo y
// Entregar (cobrando lo que resta).
export function OrderDetailModal({ order, onClose, onEdit, onChanged }: OrderDetailModalProps) {
  const ticketRef = React.useRef<HTMLDivElement>(null);
  const [busy, setBusy] = React.useState<null | "print" | "pdf" | "pay" | "deliver">(null);
  // Panel abierto debajo de los botones: anticipo o entregar.
  const [panel, setPanel] = React.useState<null | "anticipo" | "entregar">(null);
  const [method, setMethod] = React.useState<Method>("Efectivo");
  const [amount, setAmount] = React.useState("");

  React.useEffect(() => {
    setPanel(null);
    setMethod("Efectivo");
    setAmount("");
  }, [order?.id]);

  if (!order) return null;
  const total = orderTotal(order);
  const paid = orderPaid(order);
  const rest = orderRest(order);
  const pending = order.status === "PorEntregar";

  const openPanel = (next: "anticipo" | "entregar") => {
    setPanel(next);
    setMethod("Efectivo");
    setAmount("");
  };

  const handlePrint = async () => {
    if (!ticketRef.current || busy) return;
    setBusy("print");
    try {
      await printTicket(ticketRef.current);
    } catch (err) {
      console.error("Imprimir pedido falló", err);
      toast.error("No se pudo imprimir el ticket");
    } finally {
      setBusy(null);
    }
  };

  const handlePdf = async () => {
    if (busy) return;
    setBusy("pdf");
    try {
      const { exportServiceOrderPdf } = await import("@/lib/pdf/service-order-report");
      await exportServiceOrderPdf(ticketData(order));
    } catch (err) {
      console.error("Nota de servicio en PDF falló", err);
      toast.error("No se pudo descargar la nota");
    } finally {
      setBusy(null);
    }
  };

  const amountValue = Number(amount);
  const amountValid =
    MONEY_PATTERN.test(amount.trim()) && amountValue > 0 && Math.round(amountValue * 100) <= Math.round(rest * 100);

  const handleDeposit = async () => {
    if (busy || !amountValid) return;
    setBusy("pay");
    try {
      const res = await fetch(`/api/service-orders/${order.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountValue.toFixed(2), method }),
      });
      if (!res.ok) {
        const { error: message } = await res.json();
        toast.error(message ?? "No se pudo registrar el anticipo");
        return;
      }
      const updated: ApiServiceOrder = await res.json();
      toast.success(`Anticipo de ${money(amountValue)} registrado`);
      setPanel(null);
      onChanged(updated);
    } catch {
      toast.error("No se pudo registrar el anticipo");
    } finally {
      setBusy(null);
    }
  };

  const handleDeliver = async () => {
    if (busy) return;
    setBusy("deliver");
    try {
      const res = await fetch(`/api/service-orders/${order.id}/deliver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rest > 0 ? { paymentMethod: method } : {}),
      });
      if (!res.ok) {
        const { error: message } = await res.json();
        toast.error(message ?? "No se pudo entregar el pedido");
        return;
      }
      const { order: updated }: { order: ApiServiceOrder } = await res.json();
      toast.success(rest > 0 ? `Pedido ${order.folio} entregado y cobrado` : `Pedido ${order.folio} entregado`);
      setPanel(null);
      onChanged(updated);
    } catch {
      toast.error("No se pudo entregar el pedido");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={!!order} onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Pedido {order.folio}
            <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", STATUS_TAG[order.status])}>
              {STATUS_LABEL[order.status]}
            </span>
          </DialogTitle>
          <DialogDescription>
            {order.customerName} · {supplierName(order)} · Total {money(total)}
            {pending && paid > 0 && ` · Resta ${money(rest)}`}
          </DialogDescription>
        </DialogHeader>

        <TicketPreview>
          <ServiceOrderTicket ref={ticketRef} order={ticketData(order)} />
        </TicketPreview>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="cursor-pointer" onClick={handlePrint} disabled={!!busy}>
            {busy === "print" ? <Loader2 className="animate-spin" /> : <Printer />}
            Imprimir ticket
          </Button>
          <Button variant="outline" className="cursor-pointer" onClick={handlePdf} disabled={!!busy}>
            {busy === "pdf" ? <Loader2 className="animate-spin" /> : <FileDown />}
            Exportar PDF
          </Button>
        </div>

        {pending && panel === null && (
          // Una sola fila. Cancelar vive dentro de "Editar", como "Eliminar
          // producto". Sin nada por pagar no se ofrece anticipo.
          <div
            className={cn(
              "grid gap-2",
              rest > 0 ? "grid-cols-3" : order.Sale ? "grid-cols-1" : "grid-cols-2"
            )}
          >
            {/* Pagado completo: ya tiene su venta, así que no se edita ni
                se cancela. */}
            {!order.Sale && (
              <Button variant="outline" className="cursor-pointer" onClick={() => onEdit(order)} disabled={!!busy}>
                <Pencil />
                Editar
              </Button>
            )}
            {rest > 0 && (
              <Button
                variant="outline"
                className="cursor-pointer"
                onClick={() => openPanel("anticipo")}
                disabled={!!busy}
              >
                <Wallet />
                Anticipo
              </Button>
            )}
            <Button className="cursor-pointer" onClick={() => openPanel("entregar")} disabled={!!busy}>
              <PackageCheck />
              Entregar
            </Button>
          </div>
        )}

        {pending && panel === "anticipo" && (
          <div className="space-y-3 rounded-lg border p-3">
            <p className="text-sm">
              ¿Cuánto deja el cliente? Resta <span className="font-semibold">{money(rest)}</span>.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Input
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
              <MethodSelect value={method} onChange={setMethod} />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 cursor-pointer px-2 text-xs text-muted-foreground"
              onClick={() => setAmount(rest.toFixed(2))}
            >
              Paga todo ({money(rest)})
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 cursor-pointer" onClick={() => setPanel(null)} disabled={!!busy}>
                Regresar
              </Button>
              <Button className="flex-1 cursor-pointer" onClick={handleDeposit} disabled={!!busy || !amountValid}>
                {busy === "pay" ? <Loader2 className="animate-spin" /> : <Wallet />}
                Registrar {amountValid ? money(amountValue) : "anticipo"}
              </Button>
            </div>
          </div>
        )}

        {pending && panel === "entregar" && (
          <div className="space-y-3 rounded-lg border p-3">
            {rest > 0 ? (
              <>
                <p className="text-sm">
                  El cliente paga <span className="font-semibold">{money(rest)}</span>
                  {paid > 0 && ` (ya dejó ${money(paid)} de anticipo)`}. ¿Cómo pagó?
                </p>
                <MethodSelect value={method} onChange={setMethod} />
              </>
            ) : (
              <p className="text-sm">Ya está pagado completo. ¿Se lo llevan?</p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 cursor-pointer" onClick={() => setPanel(null)} disabled={!!busy}>
                Regresar
              </Button>
              <Button className="flex-1 cursor-pointer" onClick={handleDeliver} disabled={!!busy}>
                {busy === "deliver" ? (
                  <Loader2 className="animate-spin" />
                ) : rest > 0 ? (
                  <HandCoins />
                ) : (
                  <PackageCheck />
                )}
                {rest > 0 ? `Cobrar ${money(rest)} y entregar` : "Entregar"}
              </Button>
            </div>
          </div>
        )}

        {/* Leyenda en gris con lo que ya pasó. */}
        {order.status === "Entregado" && order.Sale && (
          <p className="text-xs text-muted-foreground">
            Está en el Historial de Ventas con el folio {order.Sale.folio}.
          </p>
        )}
        {order.status === "Cancelado" && (
          <p className="text-xs text-muted-foreground">Este pedido se canceló.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
