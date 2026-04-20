"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type Supplier } from "@/lib/data";
import { X, UserRoundPlus } from "lucide-react";
import { toast } from "sonner";

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
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const imagePreviewUrl = React.useMemo(
    () => (image ? URL.createObjectURL(image) : null),
    [image],
  );

  React.useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

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
      toast.success(`Proveedor "${supplier.businessName}" creado correctamente`);
    } catch {
      toast.error("Error creando proveedor");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFile = () => {
    setImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleTriggerFile = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserRoundPlus className="h-5 w-5" />
            Agregar Proveedor
          </DialogTitle>
          <DialogDescription>
            Completa los datos para registrar un nuevo proveedor en el sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">
              Negocio <span className="-ml-1 text-red-500">*</span>
            </Label>
            <Input
              value={businessName}
              placeholder="Nombre del Negocio"
              onChange={(e) => setBusinessName(e.target.value)}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">
              Proveedor <span className="-ml-1 text-red-500">*</span>
            </Label>
            <Input
              value={name}
              placeholder="Nombre del Proveedor"
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Teléfono</Label>
            <Input
              value={cellphone}
              placeholder="Teléfono del Proveedor"
              onChange={(e) => setCellphone(e.target.value)}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Email</Label>
            <Input
              type="email"
              placeholder="Correo Electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Logo</Label>
            <div className="col-span-3 space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImage(e.target.files?.[0] ?? null)}
                  className="hidden"
                />

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTriggerFile}
                  className="cursor-pointer font-normal text-muted-foreground"
                >
                  Elegir archivo
                </Button>
              </div>

              {image ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                    <span className="truncate">{image.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 cursor-pointer hover:bg-destructive/10 hover:text-destructive"
                      onClick={handleRemoveFile}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {imagePreviewUrl && (
                    <div className="overflow-hidden rounded-md border bg-muted/20">
                      <img
                        src={imagePreviewUrl}
                        alt="Vista previa del logo seleccionado"
                        className="h-32 w-full object-cover"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <p className="px-2 text-xs text-muted-foreground">
                  * Ningún archivo seleccionado
                </p>
              )}
            </div>
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
            disabled={loading}
            className="cursor-pointer"
          >
            {loading ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
