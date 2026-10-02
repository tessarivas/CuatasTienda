"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ImageIcon, Receipt } from "lucide-react";
import { ReceiptDialog } from "./receipt-dialog";
import {
  type ApiSaleRow,
  formatMoney,
  formatSaleDate,
  methodLabel,
} from "../sales-utils";

interface SaleDetailModalProps {
  sale: ApiSaleRow | null;
  onClose: () => void;
}

// Ticket completo de una venta: mismo formato que "¡Venta Completada!" de la
// caja, más origen y quién la cobró.
export function SaleDetailModal({ sale, onClose }: SaleDetailModalProps) {
  const [showReceipt, setShowReceipt] = React.useState(false);
  if (!sale) return null;

  const lines = sale.SaleItem.map((item) => {
    const unit = Number(item.finalPrice);
    const discount = Number(item.discount);
    return {
      id: item.id,
      title: item.Product.title,
      supplier: item.Product.Supplier?.businessName ?? null,
      quantity: item.quantity,
      unit,
      discount,
      subtotal: unit * item.quantity - discount,
    };
  });
  const subtotal = lines.reduce((sum, l) => sum + l.subtotal, 0);
  const saleDiscount = Number(sale.discount);

  return (
    <>
    <Dialog
      open={!!sale}
      onOpenChange={(open) => {
        if (!open) {
          setShowReceipt(false);
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Venta {sale.folio ?? `#${sale.id}`}
          </DialogTitle>
          <DialogDescription>{formatSaleDate(sale.date)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Origen</span>
            <span>
              {sale.Client ? `Apartado de ${sale.Client.name}` : "Caja"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Método de pago</span>
            <span>{methodLabel(sale.paymentMethod)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cobró</span>
            <span>{sale.User.name}</span>
          </div>
        </div>

        <Separator />

        {/* min-w-0: DialogContent es un grid y sus hijos no se encogen por
            debajo de su contenido; sin esto un nombre largo ensancha el
            modal. El nombre se muestra completo y baja de renglón si hace
            falta (sin truncar), con el precio alineado arriba. */}
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-medium">Productos</p>
          {lines.map((line) => (
            <div key={line.id} className="text-sm">
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0 wrap-break-word">
                  {line.quantity}× {line.title}
                  {line.supplier && (
                    <span className="text-muted-foreground">
                      {" "}
                      · {line.supplier}
                    </span>
                  )}
                </span>
                <span className="shrink-0 tabular-nums">
                  {formatMoney(line.subtotal)}
                </span>
              </div>
              {(line.quantity > 1 || line.discount > 0) && (
                <p className="text-xs text-muted-foreground">
                  {formatMoney(line.unit)} c/u
                  {line.discount > 0 && (
                    <span className="text-my-green-dark">
                      {" "}
                      · descuento −{formatMoney(line.discount)}
                    </span>
                  )}
                </p>
              )}
            </div>
          ))}
        </div>

        <Separator />

        <div className="space-y-1 text-sm">
          {saleDiscount > 0 && (
            <>
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatMoney(subtotal)}</span>
              </div>
              <div className="flex justify-between text-my-green-dark">
                <span>Descuento al total</span>
                <span className="tabular-nums">
                  −{formatMoney(saleDiscount)}
                </span>
              </div>
            </>
          )}
          <div className="flex justify-between pt-1 text-base font-bold">
            <span>Total</span>
            <span className="tabular-nums">
              {formatMoney(Number(sale.total))}
            </span>
          </div>
        </div>
        {/* Comprobante de tarjeta/transferencia, adjuntado en el Corte de
            Caja. Sin comprobante (pendiente o efectivo) no se muestra. */}
        {sale.receiptUrl && (
          <Button
            variant="outline"
            className="w-full cursor-pointer"
            onClick={() => setShowReceipt(true)}
          >
            <ImageIcon />
            Ver comprobante adjunto
          </Button>
        )}
      </DialogContent>
    </Dialog>
    <ReceiptDialog
      url={showReceipt ? sale.receiptUrl : null}
      title={`Venta ${sale.folio ?? `#${sale.id}`}`}
      onClose={() => setShowReceipt(false)}
    />
    </>
  );
}
