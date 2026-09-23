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
import { Pencil, Trash2, User } from "lucide-react";

interface EditSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier;
  // Se dispara tras guardar; la página recarga el proveedor desde la API.
  onSaved: () => void;
  // Cierra este modal y abre el diálogo de confirmación de borrado. Se delega
  // a la página para no anidar un AlertDialog dentro de este Dialog.
  onDelete: () => void;
}

export function EditSupplierModal({
  isOpen,
  onClose,
  supplier,
  onSaved,
  onDelete,
}: EditSupplierModalProps) {
  const [name, setName] = React.useState("");
  const [businessName, setBusinessName] = React.useState("");
  const [cellphone, setCellphone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [image, setImage] = React.useState<File | null>(null);
  const [loading, setLoading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const imagePreviewUrl = React.useMemo(
    () => (image ? URL.createObjectURL(image) : null),
    [image]
  );

  React.useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  // Preview del archivo recién elegido si hay uno; si no, el logo actual.
  const displayedLogo = imagePreviewUrl ?? supplier.logo;

  // Precarga los campos cada vez que se abre, para que cancelar y volver a
  // entrar no arrastre lo que se hubiera tecleado antes.
  React.useEffect(() => {
    if (!isOpen) return;
    setName(supplier.name ?? "");
    setBusinessName(supplier.businessName ?? "");
    setCellphone(supplier.cellphone ?? "");
    setEmail(supplier.email ?? "");
    setImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [isOpen, supplier]);

  const handleSubmit = async () => {
    if (!name.trim() || !businessName.trim()) {
      alert("Proveedor y negocio son obligatorios");
      return;
    }

    setLoading(true);
    try {
      const patchRes = await fetch(`/api/suppliers/${supplier.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          businessName: businessName.trim(),
          cellphone: cellphone.trim() || null,
          email: email.trim() || null,
        }),
      });

      if (!patchRes.ok) {
        const { error: message } = await patchRes.json();
        alert(message ?? "No se pudo guardar el proveedor");
        return;
      }

      // El logo va en una petición aparte: POST multipart al mismo recurso.
      if (image) {
        const formData = new FormData();
        formData.append("file", image);
        const logoRes = await fetch(`/api/suppliers/${supplier.id}`, {
          method: "POST",
          body: formData,
        });
        if (!logoRes.ok) {
          const { error: message } = await logoRes.json();
          alert(
            message ??
              "El proveedor se guardó, pero no se pudo subir el nuevo logo"
          );
        }
      }

      onSaved();
      onClose();
    } catch {
      alert("No se pudo guardar el proveedor");
    } finally {
      setLoading(false);
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
            <Pencil className="h-5 w-5" />
            Editar Proveedor
          </DialogTitle>
          <DialogDescription>
            Actualiza los datos de {supplier.businessName}.
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
            <div className="col-span-3">
              {/* Mismo patrón que la foto de producto: el botón vive
                  superpuesto sobre la imagen, esquina inferior derecha, en
                  vez de un botón + chip de archivo aparte. */}
              <div className="relative h-32 w-full overflow-hidden rounded-md border bg-muted/20">
                {displayedLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={displayedLogo}
                    alt={`Logo de ${supplier.businessName}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <User className="h-10 w-10 text-muted-foreground opacity-50" />
                  </div>
                )}
                <div className="absolute inset-x-2 bottom-2 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer bg-background/90 shadow-md backdrop-blur-sm"
                    onClick={handleTriggerFile}
                  >
                    <Pencil />
                    Cambiar foto
                  </Button>
                </div>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImage(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
              </div>
            </div>
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
