// app/(admin)/admin/dashboard/pos/_components/cart-item-row.tsx
"use client";

import * as React from "react";
import { type CartItem, type Discount } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { DiscountModal } from "./discount-modal";
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

  return (
    <>
      <Card className="p-3 space-y-2">
        {/* Nombre y precio */}
        <div className="flex justify-between items-start">
          <div className="flex-1 pr-2">
            <h4 className="font-medium text-sm line-clamp-2">
              {item.product.title}
            </h4>
            <p className="text-xs text-muted-foreground">
              ${item.product.price.toFixed(2)} c/u
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
            max={item.product.quantity}
          />
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 cursor-pointer"
            onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
            disabled={item.quantity >= item.product.quantity}
          >
            <Plus className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 ml-auto cursor-pointer"
            onClick={() => setShowDiscountModal(true)}
          >
            <Percent className="h-3 w-3" />
          </Button>
        </div>

        {/* Descuento aplicado */}
        {item.discount && (
          <div className="text-xs text-green-600">
            Descuento:{" "}
            {item.discount.type === "percentage"
              ? `${item.discount.value}%`
              : `$${item.discount.value}`}{" "}
            (-${itemDiscount.toFixed(2)})
          </div>
        )}

        {/* Subtotal */}
        <div className="flex justify-between items-center pt-1 border-t">
          <span className="text-sm text-muted-foreground">Subtotal:</span>
          <span className="font-semibold">${itemTotal.toFixed(2)}</span>
        </div>
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