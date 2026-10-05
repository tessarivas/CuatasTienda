// app/(admin)/admin/dashboard/pos/_components/cart.tsx
"use client";

import * as React from "react";
import { type CartItem, type Discount, type PaymentMethod } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CartItemRow } from "./cart-item-row";
import { DiscountModal } from "./discount-modal";
import { PaymentModal } from "./payment-modal";
import { ChevronDown, ChevronUp, ShoppingCart, Percent } from "lucide-react";

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
  // Modo "hoja" para celular (pos/page.tsx): plegado muestra sólo la barra
  // del carrito y el botón Cobrar; desplegado, el carrito completo. Sin
  // esta prop es la columna normal de pantallas grandes.
  sheet?: { expanded: boolean; onToggle: () => void };
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
  sheet,
}: CartProps) {
  const collapsed = !!sheet && !sheet.expanded;
  const [showTotalDiscountModal, setShowTotalDiscountModal] = React.useState(false);
  const [showPaymentModal, setShowPaymentModal] = React.useState(false);

  const hasMultipleSuppliers =
    new Set(cart.map((item) => item.product.supplierId)).size > 1;

  // Si ya había descuento total y se agrega un producto de otro proveedor,
  // el descuento deja de ser válido: se quita en vez de dejarlo aplicado.
  React.useEffect(() => {
    if (hasMultipleSuppliers && totalDiscount) onApplyTotalDiscount(undefined);
  }, [hasMultipleSuppliers, totalDiscount, onApplyTotalDiscount]);

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
        {/* Header. En modo hoja es el botón que pliega/despliega; plegado
            también enseña el total para no tener que abrirlo. */}
        {sheet ? (
          <button
            type="button"
            onClick={sheet.onToggle}
            aria-expanded={sheet.expanded}
            className="shrink-0 flex w-full cursor-pointer items-center gap-2 border-b bg-background p-4 text-left"
          >
            <ShoppingCart className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Carrito</h2>
            <span className="text-sm text-muted-foreground">
              {cart.length} {cart.length === 1 ? "item" : "items"}
            </span>
            {collapsed && cart.length > 0 && (
              <span className="ml-auto font-bold tabular-nums">${total.toFixed(2)}</span>
            )}
            <span className={collapsed && cart.length > 0 ? "" : "ml-auto"}>
              {sheet.expanded ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              )}
            </span>
          </button>
        ) : (
          <div className="shrink-0 p-4 border-b bg-background">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Carrito</h2>
              <span className="ml-auto text-sm text-muted-foreground">
                {cart.length} {cart.length === 1 ? "item" : "items"}
              </span>
            </div>
          </div>
        )}

        {/* Plegado: sólo Cobrar. */}
        {collapsed && cart.length > 0 && (
          <div className="shrink-0 bg-background p-3">
            <Button
              className="w-full cursor-pointer"
              size="lg"
              onClick={() => setShowPaymentModal(true)}
            >
              Cobrar ${total.toFixed(2)}
            </Button>
          </div>
        )}

        {/* Items del carrito */}
        {/* min-h-0: sin él, el ScrollArea (hijo flex) crece al alto de su
            contenido en vez de encogerse, y el carrito entero se estira más
            alto que la pantalla — la página scrollea y corta la cuadrícula
            de productos. Así sólo scrollea la lista y el encabezado y los
            totales quedan fijos. */}
        {/* El selector [&>…>div]:block! anula el display:table que Radix
            pone dentro del ScrollArea: sin él la fila crece al ancho del
            nombre y el truncate nunca corta (ver "UI gotchas" en CLAUDE.md). */}
        {!collapsed && (
        <ScrollArea className="flex-1 min-h-0 [&>[data-slot=scroll-area-viewport]>div]:block!">
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
        )}

        {/* Totales y acciones */}
        {!collapsed && cart.length > 0 && (
          <div className="shrink-0 p-4 border-t bg-background space-y-3">
            {/* Subtotal */}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>

            {/* Descuentos en items */}
            {itemsDiscount > 0 && (
              <div className="flex justify-between text-sm text-my-green-dark">
                <span>Descuentos en items:</span>
                <span>-${itemsDiscount.toFixed(2)}</span>
              </div>
            )}

            {/* Descuento total */}
            {totalDiscount && (
              <div className="flex justify-between text-sm text-my-green-dark">
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

            {/* Botón de descuento total. Sólo con un proveedor en el ticket:
                con varios no hay a quién cargarle un descuento al total (la
                tienda no maneja descuentos proporcionales), así que sólo se
                descuenta por producto. */}
            {hasMultipleSuppliers ? (
              // Un botón deshabilitado no recibe el mouse (pointer-events-none),
              // así que el tooltip va en un span que lo envuelve; tabIndex
              // para que también se muestre al llegar con el teclado.
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0} className="block">
                    <Button variant="outline" className="w-full" disabled>
                      <Percent />
                      Aplicar Descuento Total
                    </Button>
                  </span>
                </TooltipTrigger>
                {/* A la izquierda: arriba tapaba el total. max-w para que
                    se acomode en 2 renglones sobre la cuadrícula. */}
                <TooltipContent side="left" className="max-w-56">
                  Con productos de varios proveedores sólo se descuenta por
                  producto.
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="outline"
                className="w-full cursor-pointer"
                onClick={() => setShowTotalDiscountModal(true)}
              >
                <Percent />
                {totalDiscount ? "Editar" : "Aplicar"} Descuento Total
              </Button>
            )}

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