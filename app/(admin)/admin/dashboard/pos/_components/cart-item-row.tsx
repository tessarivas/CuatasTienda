// app/(admin)/admin/dashboard/pos/_components/cart-item-row.tsx
"use client";

import * as React from "react";
import { type CartItem, type Discount } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { DiscountModal } from "./discount-modal";
import { DashboardContext } from "../../layout";
import { Minus, Plus, Trash2, Percent } from "lucide-react";

interface CartItemRowProps {
  item: CartItem;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onApplyDiscount: (productId: string, discount?: Discount) => void;
}

export function CartItemRow({
  item,
  onUpdateQuantity,
  onRemove,
  onApplyDiscount,
}: CartItemRowProps) {
  const [showDiscountModal, setShowDiscountModal] = React.useState(false);
  const { suppliers } = React.useContext(DashboardContext);
  const supplierName = suppliers.find(
    (s) => String(s.id) === String(item.product.supplierId)
  )?.businessName;

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      onUpdateQuantity(item.product.id, value);
    }
  };

  const handleApplyDiscount = (discount?: Discount) => {
    onApplyDiscount(item.product.id, discount);
    setShowDiscountModal(false);
  };

  // Calcular subtotal del item
  const itemSubtotal = item.product.price * item.quantity;
  
  // Calcular descuento del item
  let itemDiscount = 0;
  if (item.discount) {
    if (item.discount.type === "percentage") {
      itemDiscount = itemSubtotal * (item.discount.value / 100);
    } else {
      itemDiscount = item.discount.value;
    }
  }

  const itemTotal = itemSubtotal - itemDiscount;

  // Los servicios no manejan stock: no hay tope. Los productos sí: tope =
  // unidades libres (quantity - reservedCount).
  const isService = item.product.type === "SERVICE";
  const maxQuantity = isService
    ? Number.POSITIVE_INFINITY
    : item.product.quantity - (item.product.reservedCount ?? 0);

  return (
    <>
      {/* gap-2 (no el gap-6 del Card base) y el subtotal en la misma línea
          que los controles: cada fila mide ~2 renglones, para que quepan al
          menos 3 productos en el carrito sin quitar ninguna opción. */}
      <Card className="gap-2 p-3">
        {/* Nombre y precio */}
        <div className="flex justify-between items-start">
          <div className="min-w-0 flex-1 pr-2">
            <h4
              className="truncate text-sm font-medium"
              title={item.product.title}
            >
              {item.product.title}
            </h4>
            {/* Proveedor junto al precio: en un ticket con varios
                proveedores ayuda a saber a quién se le carga cada venta. */}
            <p className="truncate text-xs text-muted-foreground">
              ${item.product.price.toFixed(2)} c/u
              {supplierName && <> · {supplierName}</>}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 cursor-pointer"
            onClick={() => onRemove(item.product.id)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>

        {/* Controles de cantidad */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 cursor-pointer"
            onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
            disabled={item.quantity <= 1}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <Input
            type="number"
            value={item.quantity}
            onChange={handleQuantityChange}
            className="h-8 w-16 text-center"
            min={1}
            {...(isService ? {} : { max: maxQuantity })}
          />
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 cursor-pointer"
            onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
            disabled={!isService && item.quantity >= maxQuantity}
          >
            <Plus className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            title="Descuento"
            className="h-8 w-8 cursor-pointer"
            onClick={() => setShowDiscountModal(true)}
          >
            <Percent className="h-3 w-3" />
          </Button>
          {/* Subtotal del renglón, a la derecha de los controles. */}
          <span className="ml-auto font-semibold tabular-nums">
            ${itemTotal.toFixed(2)}
          </span>
        </div>

        {/* Descuento aplicado */}
        {item.discount && (
          <div className="text-xs text-my-green-dark">
            Descuento:{" "}
            {item.discount.type === "percentage"
              ? `${item.discount.value}%`
              : `$${item.discount.value}`}{" "}
            (-${itemDiscount.toFixed(2)})
          </div>
        )}
      </Card>

      {/* Modal de descuento */}
      <DiscountModal
        isOpen={showDiscountModal}
        onClose={() => setShowDiscountModal(false)}
        onApply={handleApplyDiscount}
        currentDiscount={item.discount}
        maxAmount={itemSubtotal}
        title={`Descuento - ${item.product.title}`}
      />
    </>
  );
}