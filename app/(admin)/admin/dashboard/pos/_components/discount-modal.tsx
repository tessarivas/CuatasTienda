// app/(admin)/admin/dashboard/pos/_components/discount-modal.tsx
"use client";

import * as React from "react";
import { type Discount, type DiscountType } from "@/lib/data";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface DiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (discount?: Discount) => void;
  currentDiscount?: Discount;
  maxAmount: number;
  title: string;
}

export function DiscountModal({
  isOpen,
  onClose,
  onApply,
  currentDiscount,
  maxAmount,
  title,
}: DiscountModalProps) {
  const [discountType, setDiscountType] = React.useState<DiscountType>(
    currentDiscount?.type || "percentage"
  );
  const [discountValue, setDiscountValue] = React.useState<string>(
    currentDiscount?.value.toString() || ""
  );

  React.useEffect(() => {
    if (isOpen) {
      setDiscountType(currentDiscount?.type || "percentage");
      setDiscountValue(currentDiscount?.value.toString() || "");
    }
  }, [isOpen, currentDiscount]);

  const handleApply = () => {
    const value = parseFloat(discountValue);
    
    if (isNaN(value) || value <= 0) {
      alert("Por favor ingresa un valor válido");
      return;
    }

    // Validaciones
    if (discountType === "percentage" && value > 100) {
      alert("El porcentaje no puede ser mayor a 100%");
      return;
    }

    if (discountType === "fixed" && value > maxAmount) {
      alert(`El descuento no puede ser mayor a $${maxAmount.toFixed(2)}`);
      return;
    }

    onApply({ type: discountType, value });
  };

  const handleRemove = () => {
    onApply(undefined);
  };

  const handleClose = () => {
    setDiscountValue("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Tipo de descuento */}
          <div className="space-y-2">
            <Label>Tipo de descuento</Label>
            <RadioGroup
              value={discountType}
              onValueChange={(value) => setDiscountType(value as DiscountType)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="percentage" id="percentage" />
                <Label htmlFor="percentage" className="cursor-pointer">
                  Porcentaje (%)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fixed" id="fixed" />
                <Label htmlFor="fixed" className="cursor-pointer">
                  Cantidad fija ($)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Valor del descuento */}
          <div className="space-y-2">
            <Label htmlFor="discount-value">
              {discountType === "percentage" ? "Porcentaje" : "Cantidad"}
            </Label>
            <Input
              id="discount-value"
              type="number"
              placeholder={discountType === "percentage" ? "0-100" : "0.00"}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              step={discountType === "percentage" ? "1" : "0.01"}
              min="0"
              max={discountType === "percentage" ? "100" : undefined}
            />
          </div>

          {/* Vista previa */}
          {discountValue && !isNaN(parseFloat(discountValue)) && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">Vista previa:</p>
              <p className="font-semibold">
                {discountType === "percentage"
                  ? `${discountValue}% de descuento`
                  : `$${parseFloat(discountValue).toFixed(2)} de descuento`}
              </p>
              <p className="text-sm text-muted-foreground">
                Descuento:{" "}
                <span className="text-green-600 font-medium">
                  -$
                  {discountType === "percentage"
                    ? (maxAmount * (parseFloat(discountValue) / 100)).toFixed(2)
                    : parseFloat(discountValue).toFixed(2)}
                </span>
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {currentDiscount && (
            <Button
              variant="destructive"
              onClick={handleRemove}
              className="cursor-pointer"
            >
              Quitar Descuento
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleClose}
            className="cursor-pointer"
          >
            Cancelar
          </Button>
          <Button onClick={handleApply} className="cursor-pointer">
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}