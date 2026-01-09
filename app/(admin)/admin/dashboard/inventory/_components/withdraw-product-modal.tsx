"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type Product } from "@/lib/data";

interface WithdrawProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (productId: string, reason: string, user: string) => void;
  product: Product | null;
}

export function WithdrawProductModal({ isOpen, onClose, onConfirm, product }: WithdrawProductModalProps) {
  const [reason, setReason] = React.useState("");
  const [user, setUser] = React.useState("");

  const handleConfirm = () => {
    if (!product || !reason || !user) {
        alert("Todos los campos son obligatorios para confirmar el retiro.");
        return;
    };
    onConfirm(product.id, reason, user);
    setReason("");
    setUser("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Retirar Mercancía</DialogTitle>
          <DialogDescription>
            Estás a punto de dar de baja el producto: <strong>{product?.title}</strong>. Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid w-full gap-1.5">
            <Label htmlFor="reason">Motivo del retiro</Label>
            <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej: Devolución a proveedor por defecto de fábrica." />
          </div>
          <div className="grid w-full gap-1.5">
            <Label htmlFor="user">Usuario que autoriza</Label>
            <Input id="user" value={user} onChange={(e) => setUser(e.target.value)} placeholder="Tu nombre de usuario" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="destructive" onClick={handleConfirm}>Confirmar Retiro</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}