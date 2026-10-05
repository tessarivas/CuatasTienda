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
import { type Product } from "@/lib/data";
import { AlertCircle, PackageMinus, PackagePlus } from "lucide-react";
import { toast } from "@/lib/toast";

export type StockMovementKind = "Alta" | "Retiro";

interface StockMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  kind: StockMovementKind;
  // Se dispara tras registrar el movimiento; el padre refresca.
  onDone: () => void;
}

// Alta o retiro de mercancía. Un solo componente para los dos: cambian el
// texto y el tope, pero el flujo es idéntico.
export function StockMovementModal({
  isOpen,
  onClose,
  product,
  kind,
  onDone,
}: StockMovementModalProps) {
  const [amount, setAmount] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [pickedUpBy, setPickedUpBy] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const isAlta = kind === "Alta";
  const total = product.quantity ?? 0;
  const reserved = product.reservedCount ?? 0;
  // No se puede dejar el stock por debajo de lo apartado.
  const maxRetirable = Math.max(0, total - reserved);

  React.useEffect(() => {
    if (!isOpen) return;
    setAmount("");
    setReason("");
    setPickedUpBy("");
    setError("");
  }, [isOpen]);

  const parsed = Number(amount);
  const isValidAmount = Number.isInteger(parsed) && parsed > 0;
  const exceedsMax = !isAlta && isValidAmount && parsed > maxRetirable;
  const resultingTotal = isValidAmount
    ? isAlta
      ? total + parsed
      : total - parsed
    : total;

  const handleSubmit = async () => {
    if (!isValidAmount) {
      setError("Escribe un número entero mayor a cero");
      return;
    }
    if (exceedsMax) {
      setError(
        `Sólo puedes retirar hasta ${maxRetirable} ${
          maxRetirable === 1 ? "unidad" : "unidades"
        }`
      );
      return;
    }

    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${product.id}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: kind,
          quantity: parsed,
          reason: reason.trim() || undefined,
          pickedUpBy: !isAlta ? pickedUpBy.trim() || undefined : undefined,
        }),
      });

      if (!res.ok) {
        const { error: message } = await res.json();
        setError(message ?? "No se pudo registrar el movimiento");
        return;
      }

      onDone();
      onClose();
      toast.success(
        isAlta
          ? `${parsed} ${parsed === 1 ? "unidad agregada" : "unidades agregadas"}`
          : `${parsed} ${parsed === 1 ? "unidad retirada" : "unidades retiradas"}`
      );
    } catch {
      setError("No se pudo registrar el movimiento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {/* Sin color: los demás títulos de modal (add/edit-supplier)
                usan el ícono en text-foreground, sin distinguir por tipo
                de acción. */}
            {isAlta ? (
              <PackagePlus className="h-5 w-5" />
            ) : (
              <PackageMinus className="h-5 w-5" />
            )}
            {isAlta ? "Agregar unidades" : "Retirar mercancía"}
          </DialogTitle>
          <DialogDescription>
            {isAlta
              ? `Entrada de mercancía para ${product.title}.`
              : `Salida por merma, daño o devolución al proveedor. No registra una venta.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Estado actual, para no tener que cerrar y volver a mirar. */}
          <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
            <span className="text-muted-foreground">Stock actual</span>
            <span className="font-semibold tabular-nums">
              {total}
              {reserved > 0 && (
                <span className="ml-2 rounded-full bg-my-orange-light px-2 py-0.5 text-xs font-semibold text-my-orange-dark">
                  {reserved} {reserved === 1 ? "apartada" : "apartadas"}
                </span>
              )}
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stock-amount">
              {isAlta ? "Unidades a agregar" : "Unidades a retirar"}
            </Label>
            <Input
              id="stock-amount"
              type="number"
              min={1}
              max={isAlta ? undefined : maxRetirable}
              inputMode="numeric"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
            {!isAlta && (
              <p className="text-xs text-muted-foreground">
                Máximo {maxRetirable}{" "}
                {maxRetirable === 1 ? "unidad" : "unidades"}
                {reserved > 0 && " (las apartadas no se pueden retirar)"}.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="stock-reason">
              Motivo <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="stock-reason"
              placeholder={
                isAlta ? "Compra a proveedor" : "Producto dañado"
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={300}
            />
          </div>

          {/* Sólo en retiro: en una alta no hay nadie que "recoja" nada. */}
          {!isAlta && (
            <div className="space-y-2">
              <Label htmlFor="stock-picked-up-by">
                Retirado por{" "}
                <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="stock-picked-up-by"
                placeholder="Nombre de la persona"
                value={pickedUpBy}
                onChange={(e) => setPickedUpBy(e.target.value)}
                maxLength={150}
              />
            </div>
          )}

          {isValidAmount && !exceedsMax && (
            <p className="text-sm text-muted-foreground">
              El stock quedará en{" "}
              <span className="font-semibold text-foreground tabular-nums">
                {resultingTotal}
              </span>{" "}
              {resultingTotal === 1 ? "unidad" : "unidades"}.
            </p>
          )}

          {error && (
            <div className="flex items-start gap-3 rounded-lg bg-my-red-light p-3 text-my-red-dark">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !isValidAmount || exceedsMax}
            className="cursor-pointer"
          >
            {loading
              ? "Registrando..."
              : isAlta
                ? "Agregar unidades"
                : "Retirar mercancía"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
