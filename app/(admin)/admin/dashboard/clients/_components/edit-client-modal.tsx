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
import { type Client } from "@/lib/data";
import { type ApiClient } from "@/lib/clients/normalize";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";

interface EditClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  // Se dispara tras guardar con el cliente que devolvió la API.
  onSaved: (updated: ApiClient) => void;
  // Cierra este modal y abre el diálogo de eliminar. Se delega a la página
  // para no anidar un AlertDialog dentro de este Dialog (mismo patrón que
  // edit-supplier-modal.tsx).
  onDelete: () => void;
}

export function EditClientModal({
  isOpen,
  onClose,
  client,
  onSaved,
  onDelete,
}: EditClientModalProps) {
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  // Precarga los campos cada vez que se abre, para que cancelar y volver a
  // entrar no arrastre lo que se hubiera tecleado antes.
  React.useEffect(() => {
    if (!isOpen) return;
    setName(client.name);
    setPhone(client.phone);
  }, [isOpen, client]);

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) {
      toast.warning("El nombre y el teléfono son obligatorios.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), cellphone: phone.trim() }),
      });
      if (!res.ok) {
        const { error: message } = await res.json();
        toast.error(message ?? "No se pudo guardar el cliente");
        return;
      }
      const updated: ApiClient = await res.json();
      onSaved(updated);
      onClose();
      toast.success("Cliente actualizado");
    } catch {
      toast.error("No se pudo guardar el cliente");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Editar Cliente
          </DialogTitle>
          <DialogDescription>
            Actualiza los datos de {client.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-client-name" className="text-right">
              Nombre <span className="-ml-1 text-my-red">*</span>
            </Label>
            <Input
              id="edit-client-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-client-phone" className="text-right">
              Teléfono <span className="-ml-1 text-my-red">*</span>
            </Label>
            <Input
              id="edit-client-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            variant="destructive"
            onClick={onDelete}
            disabled={loading}
            className="cursor-pointer"
          >
            <Trash2 />
            Eliminar
          </Button>
          <div className="flex gap-2">
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
              disabled={loading}
              className="cursor-pointer"
            >
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
