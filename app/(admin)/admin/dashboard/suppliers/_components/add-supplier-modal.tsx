"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type Supplier } from "@/lib/data";

interface AddSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (newSupplier: Omit<Supplier, "id" | "logo">) => void;
}

export function AddSupplierModal({ isOpen, onClose, onAdd }: AddSupplierModalProps) {
  const [name, setName] = React.useState("");
  const [businessName, setBusinessName] = React.useState("");
  const [cellphone, setCellphone] = React.useState("");
  const [email, setEmail] = React.useState("");

  const handleSubmit = () => {
    if (!name || !businessName) {
      alert("El nombre del proveedor y el negocio son obligatorios.");
      return;
    }

    onAdd({
      name,
      businessName,
      cellphone,
      email,
    });

    setName("");
    setBusinessName("");
    setCellphone("");
    setEmail("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>Agregar Nuevo Proveedor</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Negocio</Label>
            <Input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Proveedor</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Teléfono</Label>
            <Input
              value={cellphone}
              onChange={(e) => setCellphone(e.target.value)}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="cursor-pointer">Cancelar</Button>
          <Button onClick={handleSubmit} className="cursor-pointer">Guardar Proveedor</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}