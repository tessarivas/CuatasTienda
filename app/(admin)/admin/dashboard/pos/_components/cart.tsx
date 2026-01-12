// app/(admin)/admin/dashboard/pos/_components/cart.tsx
"use client";

import * as React from "react";
import { type CartItem, type Discount, type PaymentMethod } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CartItemRow } from "./cart-item-row";
import { DiscountModal } from "./discount-modal";
import { PaymentModal } from "./payment-modal";
import { ShoppingCart, Percent } from "lucide-react";

interface CartProps {
  cart: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onApplyItemDiscount: (productId: string, discount?: Discount) => void;
  totalDiscount?: Discount;
  onApplyTotalDiscount: (discount?: Discount) => void;
  subtotal: number;
  itemsDiscount: number;
  total: number;
  onProcessSale: (paymentMethod: PaymentMethod) => void;
}

export function Cart({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onApplyItemDiscount,
  totalDiscount,
  onApplyTotalDiscount,
  subtotal,
  itemsDiscount,
  total,
  onProcessSale,
}: CartProps) {
  const [showTotalDiscountModal, setShowTotalDiscountModal] = React.useState(false);
  const [showPaymentModal, setShowPaymentModal] = React.useState(false);

  const handleApplyTotalDiscount = (discount?: Discount) => {
    onApplyTotalDiscount(discount);
    setShowTotalDiscountModal(false);
  };

  const handlePayment = (paymentMethod: PaymentMethod) => {
    onProcessSale(paymentMethod);
    setShowPaymentModal(false);
  };

  return (
    <>
      <div className="flex flex-col h-full bg-muted/30">
        {/* Header */}
        <div className="p-4 border-b bg-background">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Carrito</h2>
            <span className="ml-auto text-sm text-muted-foreground">
              {cart.length} {cart.length === 1 ? "item" : "items"}
            </span>
          </div>
        </div>

        {/* Items del carrito */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mb-2" />
                <p>El carrito está vacío</p>
                <p className="text-sm">Agrega productos para comenzar</p>
              </div>
            ) : (
              cart.map((item) => (
                <CartItemRow
                  key={item.product.id}
                  item={item}
                  onUpdateQuantity={onUpdateQuantity}
                  onRemove={onRemoveItem}
                  onApplyDiscount={onApplyItemDiscount}
                />
              ))
            )}
          </div>
        </ScrollArea>

        {/* Totales y acciones */}
        {cart.length > 0 && (
          <div className="p-4 border-t bg-background space-y-3">
            {/* Subtotal */}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>

            {/* Descuentos en items */}
            {itemsDiscount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Descuentos en items:</span>
                <span>-${itemsDiscount.toFixed(2)}</span>
              </div>
            )}

            {/* Descuento total */}
            {totalDiscount && (
              <div className="flex justify-between text-sm text-green-600">
                <span>
                  Descuento total (
                  {totalDiscount.type === "percentage"
                    ? `${totalDiscount.value}%`
                    : `$${totalDiscount.value}`}
                  ):
                </span>
                <span>
                  -$
                  {totalDiscount.type === "percentage"
                    ? ((subtotal - itemsDiscount) * (totalDiscount.value / 100)).toFixed(2)
                    : totalDiscount.value.toFixed(2)}
                </span>
              </div>
            )}

            <Separator />

            {/* Total */}
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span className="text-primary">${total.toFixed(2)}</span>
            </div>

            {/* Botón de descuento total */}
            <Button
              variant="outline"
              className="w-full cursor-pointer"
              onClick={() => setShowTotalDiscountModal(true)}
            >
              <Percent className="mr-2 h-4 w-4" />
              {totalDiscount ? "Editar" : "Aplicar"} Descuento Total
            </Button>

            {/* Botón de cobrar */}
            <Button
              className="w-full cursor-pointer"
              size="lg"
              onClick={() => setShowPaymentModal(true)}
            >
              Cobrar ${total.toFixed(2)}
            </Button>
          </div>
        )}
      </div>

      {/* Modales */}
      <DiscountModal
        isOpen={showTotalDiscountModal}
        onClose={() => setShowTotalDiscountModal(false)}
        onApply={handleApplyTotalDiscount}
        currentDiscount={totalDiscount}
        maxAmount={subtotal - itemsDiscount}
        title="Descuento al Total"
      />

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onConfirm={handlePayment}
        total={total}
      />
    </>
  );
}