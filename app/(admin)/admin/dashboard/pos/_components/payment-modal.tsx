// app/(admin)/admin/dashboard/pos/_components/payment-modal.tsx
"use client";

import * as React from "react";
import { type PaymentMethod } from "@/lib/data";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CreditCard, Banknote, ArrowLeftRight } from "lucide-react";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (paymentMethod: PaymentMethod) => void;
  total: number;
}

export function PaymentModal({
  isOpen,
  onClose,
  onConfirm,
  total,
}: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>("Efectivo");

  const handleConfirm = () => {
    onConfirm(paymentMethod);
    onClose();
  };

  const paymentMethods = [
    {
      value: "Efectivo" as PaymentMethod,
      label: "Efectivo",
      icon: Banknote,
      description: "Pago en efectivo",
    },
    {
      value: "Tarjeta" as PaymentMethod,
      label: "Tarjeta",
      icon: CreditCard,
      description: "Débito o crédito",
    },
    {
      value: "Transferencia" as PaymentMethod,
      label: "Transferencia",
      icon: ArrowLeftRight,
      description: "Transferencia bancaria",
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Método de Pago</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Total a pagar */}
          <div className="p-4 bg-primary/10 rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-1">Total a cobrar</p>
            <p className="text-3xl font-bold text-primary">
              ${total.toFixed(2)}
            </p>
          </div>

          {/* Métodos de pago */}
          <div className="space-y-2">
            <Label>Selecciona el método de pago</Label>
            <RadioGroup
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
              className="space-y-2"
            >
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <div
                    key={method.value}
                    className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      paymentMethod === method.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setPaymentMethod(method.value)}
                  >
                    <RadioGroupItem value={method.value} id={method.value} />
                    <Icon className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <Label
                        htmlFor={method.value}
                        className="text-base font-medium cursor-pointer"
                      >
                        {method.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {method.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </RadioGroup>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="cursor-pointer"
          >
            Cancelar
          </Button>
          <Button onClick={handleConfirm} className="cursor-pointer">
            Confirmar Venta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}