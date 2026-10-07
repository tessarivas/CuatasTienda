"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, Loader2, Undo2 } from "lucide-react";
import { type PaymentMethod } from "./add-payment-modal";

const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;

interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Lo que le sobra al cliente (saldo − apartados vigentes): el máximo que
  // se puede devolver. El servidor lo vuelve a calcular.
  surplus: number;
  onRefund: (amount: number, method: PaymentMethod) => Promise<void>;
}

// "Devolver saldo" (#36): regresa al cliente el saldo a favor que ya no
// cubre ningún apartado. Mismo formato que "Agregar Abono".
export function RefundModal({ isOpen, onClose, surplus, onRefund }: RefundModalProps) {
  const [amount, setAmount] = React.useState("");
  const [method, setMethod] = React.useState<PaymentMethod>("Efectivo");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Al abrir, propone devolver todo lo que sobra.
  React.useEffect(() => {
    if (isOpen) {
      setAmount(surplus.toFixed(2));
      setMethod("Efectivo");
    }
  }, [isOpen, surplus]);

  const value = Number(amount);
  const isValidAmount =
    MONEY_PATTERN.test(amount.trim()) && value > 0 && Math.round(value * 100) <= Math.round(surplus * 100);

  const handleSubmit = async () => {
    if (!isValidAmount || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onRefund(value, method);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => !isSubmitting && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Undo2 className="h-5 w-5" />
            Devolver saldo
          </DialogTitle>
          <DialogDescription>
            Le sobran ${surplus.toFixed(2)}. El monto se resta de su saldo y queda
            anotado en su historial.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="refund-amount" className="text-right">
              Monto
            </Label>
            <div className="relative col-span-3">
              <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="refund-amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="refund-method" className="text-right">
              Método
            </Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger id="refund-method" className="col-span-3 w-full cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Efectivo">Efectivo</SelectItem>
                <SelectItem value="Transferencia">Transferencia</SelectItem>
                <SelectItem value="Tarjeta">Tarjeta</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Leyenda en gris: de dónde sale el dinero en el corte. */}
          <p className="col-span-4 text-xs text-muted-foreground">
            {method === "Efectivo"
              ? "En efectivo sale de la caja de apartados en el Corte de Caja."
              : "Se resta de banco en el Corte de Caja."}
            {!isValidAmount && amount.trim() !== "" && value > surplus
              ? ` No puede ser mayor a $${surplus.toFixed(2)}.`
              : ""}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="cursor-pointer">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!isValidAmount || isSubmitting} className="cursor-pointer">
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Undo2 />}
            Devolver ${isValidAmount ? value.toFixed(2) : "0.00"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
