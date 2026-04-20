"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";

// La prop onAdd solo pasará los datos que el modal conoce
interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: { name: string; phone: string }) => void;
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
  };

  // Limpiamos los campos solo cuando el modal se cierra desde el padre
  React.useEffect(() => {
    if (!isOpen) {
      setName("");
      setPhone("");
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Agregar Nuevo Cliente
          </DialogTitle>
          <DialogDescription>
            Completa los datos para registrar un nuevo cliente en el sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nombre <span className="-ml-1 text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              placeholder="Nombre del Cliente"
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phone" className="text-right">
              Teléfono <span className="-ml-1 text-red-500">*</span>
            </Label>
            <Input
              id="phone"
              value={phone}
              placeholder="Teléfono del Cliente"
              onChange={(e) => setPhone(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            className="cursor-pointer"
          >
            Guardar Cliente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}