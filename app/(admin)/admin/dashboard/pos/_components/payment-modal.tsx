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
import { Input } from "@/components/ui/input";
import { CreditCard, Banknote, ArrowLeftRight, Loader2, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;
// Billetes con que suelen pagar; se ofrecen sólo los que alcanzan.
const BILLS = [20, 50, 100, 200, 500, 1000];

const money = (n: number) =>
  `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  // El padre guarda la venta y cierra el modal sólo si salió bien.
  onConfirm: (paymentMethod: PaymentMethod) => void;
  total: number;
  // Mientras se guarda la venta: botón con loader y el modal no se cierra
  // (antes se cerraba al instante y por 1–2 s no se veía nada).
  processing?: boolean;
}

export function PaymentModal({
  isOpen,
  onClose,
  onConfirm,
  total,
  processing = false,
}: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>("Efectivo");
  // Calculadora de cambio (sólo efectivo): con cuánto paga el cliente. Es
  // sólo ayuda para dar el cambio; no se guarda ni bloquea la venta.
  const [paidWith, setPaidWith] = React.useState("");
  React.useEffect(() => {
    if (isOpen) setPaidWith("");
  }, [isOpen]);

  const paidValid = MONEY_PATTERN.test(paidWith.trim());
  const paid = paidValid ? Number(paidWith) : 0;
  // Redondeo a centavos para que 200 - 14.30 no salga 185.69999…
  const change = Math.round((paid - total) * 100) / 100;
  const bills = BILLS.filter((b) => b >= total).slice(0, 5);

  const handleConfirm = () => {
    if (processing) return;
    onConfirm(paymentMethod);
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
    <Dialog open={isOpen} onOpenChange={() => !processing && onClose()}>
      {/* Dos columnas desde md: métodos a la izquierda y la calculadora de
          cambio a la derecha, para que en pantallas bajas (laptop de la
          caja) quepa todo sin scroll. En celular se apila y, si no cabe, se
          desliza el modal completo. */}
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md md:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Método de Pago
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 py-2 md:grid-cols-2 md:gap-6">
          {/* Izquierda: total y método de pago */}
          <div className="space-y-4">
          <div className="rounded-lg border p-3 text-center">
            <p className="text-sm text-muted-foreground">Total a cobrar</p>
            <p className="text-3xl font-bold text-primary tabular-nums">
              {money(total)}
            </p>
          </div>

          {/* Métodos de pago */}
          <div className="space-y-2">
            <Label>Selecciona el método de pago</Label>
            <RadioGroup
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
              // gap-2.5 reemplaza el gap-3 del RadioGroup (sin space-y
              // encima, que lo duplicaba): la mitad del espacio de antes.
              className="gap-2"
            >
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <div
                    key={method.value}
                    className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg border-2 cursor-pointer transition-colors ${
                      paymentMethod === method.value
                        ? "border-primary"
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

          {/* Derecha: cambio (con cuánto paga y cuánto se le regresa). */}
          {paymentMethod === "Efectivo" ? (
            <div className="flex flex-col gap-3 rounded-lg border p-4">
              <div className="space-y-1.5">
                <Label htmlFor="paid-with" className="font-bold">
                  Pago
                </Label>
                <Input
                  id="paid-with"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={paidWith}
                  onChange={(e) => setPaidWith(e.target.value)}
                  className="h-11 text-right text-xl font-semibold tabular-nums md:text-xl"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {bills.map((b) => (
                  <Button
                    key={b}
                    type="button"
                    variant="outline"
                    className={cn(
                      "cursor-pointer tabular-nums",
                      paidValid && paid === b && "border-primary"
                    )}
                    onClick={() => setPaidWith(String(b))}
                  >
                    ${b}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => setPaidWith(total.toFixed(2))}
                >
                  Exacto
                </Button>
              </div>
              {/* mt-auto: el cambio queda abajo, a la altura de los métodos. */}
              <div className="mt-auto flex items-center justify-between border-t-2 border-foreground pt-3">
                <span className="font-medium">{change < 0 ? "Falta" : "Cambio"}</span>
                <span
                  className={cn(
                    "text-3xl font-bold tabular-nums",
                    !paidValid && "text-muted-foreground",
                    paidValid && change < 0 && "text-my-red-dark",
                    paidValid && change >= 0 && "text-my-green-dark"
                  )}
                >
                  {paidValid ? money(Math.abs(change)) : "—"}
                </span>
              </div>
            </div>
          ) : (
            // Tarjeta / transferencia: no hay cambio. Se dice qué sigue para
            // que la columna no quede vacía.
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border p-6 text-center">
              <div className="rounded-full bg-muted p-4">
                {paymentMethod === "Tarjeta" ? (
                  <CreditCard className="h-7 w-7 text-muted-foreground" />
                ) : (
                  <ArrowLeftRight className="h-7 w-7 text-muted-foreground" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Sin cambio que dar. El comprobante se adjunta después, en el Corte de Caja.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={processing}
            className="cursor-pointer"
          >
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={processing} className="cursor-pointer">
            {processing && <Loader2 className="animate-spin" />}
            {processing ? "Registrando venta…" : "Confirmar Venta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}