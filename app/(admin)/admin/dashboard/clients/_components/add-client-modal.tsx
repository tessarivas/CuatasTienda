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
import { type Client } from "@/lib/data";

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (newClient: Omit<Client, "id">) => void;
}

export function AddClientModal({
  isOpen,
  onClose,
  onAdd,
}: AddClientModalProps) {
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");

  const handleSubmit = () => {
    if (!name || !phone) {
      alert("El nombre y el teléfono son obligatorios.");
      return;
    }
    onAdd({ name, phone });
    // Limpiar formulario y cerrar
    setName("");
    setPhone("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>Agregar Nuevo Cliente</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nombre
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phone" className="text-right">
              Teléfono
            </Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="cursor-pointer">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} className="cursor-pointer">
            Guardar Cliente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}