"use client";

import * as React from "react";
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
import { Plus, DollarSign } from "lucide-react";

interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPayment: (amount: number) => void;
}

export function AddPaymentModal({
  isOpen,
  onClose,
  onAddPayment,
}: AddPaymentModalProps) {
  const [amount, setAmount] = React.useState("");

  // Botones de cantidad rápida
  const quickAmounts = [100, 200, 500, 1000];

  const handleSubmit = () => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      alert("Por favor, ingrese un monto válido mayor a 0.");
      return;
    }
    onAddPayment(numericAmount);
    setAmount("");
    onClose();
  };

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <Plus className="h-6 w-6 text-green-600" />
            </div>
            Agregar Abono
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Input grande */}
          <div className="space-y-3">
            <Label htmlFor="amount" className="text-lg font-semibold">
              ¿Cuánto dinero va a abonar?
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-3xl font-bold h-20 pl-14 text-center"
                autoFocus
              />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Ingresa la cantidad en pesos mexicanos (MXN)
            </p>
          </div>

          {/* Botones de cantidad rápida */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Cantidades rápidas:</Label>
            <div className="grid grid-cols-4 gap-2">
              {quickAmounts.map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant="outline"
                  className="h-14 text-lg font-semibold cursor-pointer hover:bg-green-50 hover:border-green-300"
                  onClick={() => handleQuickAmount(value)}
                >
                  ${value}
                </Button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 && (
            <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
              <p className="text-sm text-green-800 mb-1">Se va a abonar:</p>
              <p className="text-3xl font-bold text-green-700">
                ${parseFloat(amount).toFixed(2)} MXN
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 h-12 text-lg cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1 h-12 text-lg cursor-pointer bg-green-600 hover:bg-green-700"
            disabled={!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0}
          >
            <Plus className="mr-2 h-5 w-5" />
            Guardar Abono
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}