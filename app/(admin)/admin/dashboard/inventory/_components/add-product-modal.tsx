"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type Product, type ProductType, type Supplier } from "@/lib/data";
import { PackagePlus, X } from "lucide-react";

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (product: Product) => void;
  suppliers: Supplier[];
  type?: ProductType;
  // Cuando el modal se abre desde el detalle de un proveedor, bloqueamos
  // el select al proveedor en cuestión.
  supplierId?: string;
}

export function AddProductModal({
  isOpen,
  onClose,
  onAdd,
  suppliers,
  type = "PRODUCT",
  supplierId: lockedSupplierId,
}: AddProductModalProps) {
  const isService = type === "SERVICE";
  const [title, setTitle] = React.useState("");
  const [price, setPrice] = React.useState(0);
  const [quantity, setQuantity] = React.useState(1);
  const [image, setImage] = React.useState<File | null>(null);
  const [supplierId, setSupplierId] = React.useState(
    lockedSupplierId ?? ""
  );
  const [loading, setLoading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const imagePreviewUrl = React.useMemo(
    () => (image ? URL.createObjectURL(image) : null),
    [image],
  );

  // Si el padre cambia el supplierId bloqueado (o el modal se reabre),
  // sincronizamos el state interno.
  React.useEffect(() => {
    if (lockedSupplierId) setSupplierId(lockedSupplierId);
  }, [lockedSupplierId, isOpen]);

  React.useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const handleSubmit = async () => {
    if (!title || !price || !supplierId || (!isService && !quantity)) {
      alert(
        isService
          ? "Título, precio y proveedor son obligatorios."
          : "Todos los campos son obligatorios, incluyendo el proveedor.",
      );
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("price", String(price));
    formData.append("type", type);
    if (!isService) formData.append("quantity", String(quantity));
    formData.append("supplierId", supplierId);
    if (image) formData.append("image", image);

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const { error: message } = await res.json().catch(() => ({}));
        alert(message ?? (isService ? "Error creando servicio" : "Error creando producto"));
        return;
      }

      const product: Product = await res.json();
      onAdd(product);

      setTitle("");
      setPrice(0);
      setQuantity(1);
      setImage(null);
      setSupplierId(lockedSupplierId ?? "");
      onClose();
    } catch {
      alert(isService ? "Error creando servicio" : "Error creando producto");
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
            <PackagePlus className="h-5 w-5" />
            {isService ? "Agregar Nuevo Servicio" : "Agregar Nuevo Producto"}
          </DialogTitle>
          <DialogDescription>
            {isService
              ? "Los servicios no tienen inventario ni se pueden apartar; sólo se venden en caja."
              : "Completa los detalles para registrar un nuevo producto en el inventario."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="supplier" className="text-right">
              Proveedor <span className="-ml-1 text-red-500">*</span>
            </Label>
            <Select
              value={supplierId}
              onValueChange={setSupplierId}
              disabled={!!lockedSupplierId}
            >
              <SelectTrigger id="supplier" className="col-span-3">
                <SelectValue placeholder="Selecciona un proveedor" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={String(supplier.id)}>
                    {supplier.businessName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Título <span className="-ml-1 text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              placeholder={isService ? "Nombre del Servicio" : "Nombre del Producto"}
              onChange={(e) => setTitle(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="price" className="text-right">
              Precio <span className="-ml-1 text-red-500">*</span>
            </Label>
            <Input
              id="price"
              type="number"
              value={price}
              placeholder="0.00"
              onChange={(e) => setPrice(Number(e.target.value))}
              className="col-span-3"
            />
          </div>
          {!isService && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity" className="text-right">
                Cantidad <span className="-ml-1 text-red-500">*</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                value={quantity}
                placeholder="Cantidad inicial"
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="col-span-3"
              />
            </div>
          )}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Imagen</Label>
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
                        alt="Vista previa de la imagen seleccionada"
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
          <Button variant="outline" onClick={onClose} className="cursor-pointer">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading} className="cursor-pointer">
            {loading
              ? "Guardando..."
              : isService
              ? "Agregar Servicio"
              : "Agregar Producto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}