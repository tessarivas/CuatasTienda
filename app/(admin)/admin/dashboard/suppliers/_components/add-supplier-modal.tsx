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
import { type Supplier } from "@/lib/data";

interface AddSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (supplier: Supplier) => void;
}

export function AddSupplierModal({
  isOpen,
  onClose,
  onAdd,
}: AddSupplierModalProps) {
  const [name, setName] = React.useState("");
  const [businessName, setBusinessName] = React.useState("");
  const [cellphone, setCellphone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [image, setImage] = React.useState<File | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async () => {
    if (!name || !businessName) {
      alert("Proveedor y negocio son obligatorios");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("businessName", businessName);
    formData.append("cellphone", cellphone);
    formData.append("email", email);
    if (image) formData.append("image", image);

    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error();

      const supplier: Supplier = await res.json();
      onAdd(supplier);

      setName("");
      setBusinessName("");
      setCellphone("");
      setEmail("");
      setImage(null);
      onClose();
    } catch {
      alert("Error creando proveedor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar Proveedor</DialogTitle>
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

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Logo</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) =>
                setImage(e.target.files?.[0] ?? null)
              }
              className="col-span-3"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
