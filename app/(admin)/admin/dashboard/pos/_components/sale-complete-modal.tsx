// app/(admin)/admin/dashboard/pos/_components/sale-complete-modal.tsx
"use client";

import * as React from "react";
import { type Sale } from "@/lib/data";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2 } from "lucide-react";

interface SaleCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleId: string;
  sale?: Sale;
}

export function SaleCompleteModal({
  isOpen,
  onClose,
  saleId,
  sale,
}: SaleCompleteModalProps) {
  if (!sale) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateItemsTotal = () => {
    return sale.items.reduce((total, item) => {
      return total + item.unitPrice * item.quantity;
    }, 0);
  };

  const calculateItemsDiscount = () => {
    return sale.items.reduce((total, item) => {
      if (!item.discount) return total;
      const itemTotal = item.unitPrice * item.quantity;
      if (item.discount.type === "percentage") {
        return total + itemTotal * (item.discount.value / 100);
      }
      return total + item.discount.value;
    }, 0);
  };

  const itemsTotal = calculateItemsTotal();
  const itemsDiscount = calculateItemsDiscount();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex flex-col items-center gap-2">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
            <DialogTitle className="text-2xl">¡Venta Completada!</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información de la venta */}
          <div className="text-center space-y-1">
            <p className="text-sm text-muted-foreground">Folio de venta</p>
            <p className="font-mono font-semibold">{saleId}</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(sale.date)}
            </p>
          </div>

          <Separator />

          {/* Productos */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Productos:</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {sale.items.map((item, index) => (
                <div key={index} className="text-sm">
                  <div className="flex justify-between">
                    <span>
                      {item.quantity}x {item.productTitle}
                    </span>
                    <span>${(item.unitPrice * item.quantity).toFixed(2)}</span>
                  </div>
                  {item.discount && (
                    <div className="text-xs text-green-600 pl-4">
                      Descuento:{" "}
                      {item.discount.type === "percentage"
                        ? `${item.discount.value}%`
                        : `$${item.discount.value}`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Resumen de totales */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>${itemsTotal.toFixed(2)}</span>
            </div>

            {itemsDiscount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Descuentos en items:</span>
                <span>-${itemsDiscount.toFixed(2)}</span>
              </div>
            )}

            {sale.totalDiscount && (
              <div className="flex justify-between text-sm text-green-600">
                <span>
                  Descuento total (
                  {sale.totalDiscount.type === "percentage"
                    ? `${sale.totalDiscount.value}%`
                    : `$${sale.totalDiscount.value}`}
                  ):
                </span>
                <span>
                  -$
                  {sale.totalDiscount.type === "percentage"
                    ? (
                        (itemsTotal - itemsDiscount) *
                        (sale.totalDiscount.value / 100)
                      ).toFixed(2)
                    : sale.totalDiscount.value.toFixed(2)}
                </span>
              </div>
            )}

            <Separator />

            <div className="flex justify-between text-lg font-bold">
              <span>Total pagado:</span>
              <span className="text-primary">${sale.total.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Método de pago:</span>
              <span className="font-medium">{sale.paymentMethod}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="w-full cursor-pointer">
            Nueva Venta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}