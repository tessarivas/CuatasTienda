"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { DollarSign, Plus } from "lucide-react";
import { toast } from "@/lib/toast";

export type PaymentMethod = "Efectivo" | "Tarjeta" | "Transferencia";

interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPayment: (amount: number, method: PaymentMethod) => void | Promise<void>;
}

const QUICK_AMOUNTS = [100, 200, 500, 1000];

export function AddPaymentModal({
  isOpen,
  onClose,
  onAddPayment,
}: AddPaymentModalProps) {
  const [amount, setAmount] = React.useState("");
  const [method, setMethod] = React.useState<PaymentMethod>("Efectivo");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) {
      setAmount("");
      setMethod("Efectivo");
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const numericAmount = parseFloat(amount);
  const isValidAmount = !isNaN(numericAmount) && numericAmount > 0;

  const handleSubmit = async () => {
    if (!isValidAmount) {
      toast.warning("Por favor, ingrese un monto válido mayor a 0.");
      return;
    }
    setIsSubmitting(true);
    try {
      await onAddPayment(numericAmount, method);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Agregar Abono
          </DialogTitle>
          <DialogDescription>
            El monto se suma al saldo a favor del cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Monto <span className="-ml-1 text-my-red">*</span>
            </Label>
            <div className="relative col-span-3">
              <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              {/* text + inputMode en vez de type="number": mismo teclado
                  numérico en móvil, sin las flechitas de incremento. */}
              <Input
                id="amount"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <div className="col-span-3 col-start-2 grid grid-cols-4 gap-2">
              {QUICK_AMOUNTS.map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => setAmount(value.toString())}
                >
                  ${value}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="method" className="text-right">
              Método
            </Label>
            <Select
              value={method}
              onValueChange={(v) => setMethod(v as PaymentMethod)}
            >
              <SelectTrigger id="method" className="col-span-3 w-full cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Efectivo">Efectivo</SelectItem>
                <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                <SelectItem value="Transferencia">Transferencia</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !isValidAmount}
            className="cursor-pointer"
          >
            {isSubmitting ? "Guardando..." : "Guardar Abono"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
