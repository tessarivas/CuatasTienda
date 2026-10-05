"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type Product, type ProductType, type Supplier } from "@/lib/data";
import { Check, Loader2, PackagePlus, X } from "lucide-react";
import { toast } from "@/lib/toast";

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

// Qué botón se usó al guardar: "close" cierra el modal; "another" lo deja
// abierto, limpio y con el mismo proveedor para capturar el siguiente.
type SaveMode = "close" | "another";

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
  // Texto, no número: así el campo arranca vacío (con placeholder) en vez
  // de mostrar un 0 que hay que borrar.
  const [price, setPrice] = React.useState("");
  const [quantity, setQuantity] = React.useState(1);
  const [image, setImage] = React.useState<File | null>(null);
  const [supplierId, setSupplierId] = React.useState(
    lockedSupplierId ?? ""
  );
  const [saving, setSaving] = React.useState<SaveMode | null>(null);
  // Cuántos se agregaron sin cerrar el modal ("Guardar y agregar otro").
  const [addedCount, setAddedCount] = React.useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const titleRef = React.useRef<HTMLInputElement>(null);
  const imagePreviewUrl = React.useMemo(
    () => (image ? URL.createObjectURL(image) : null),
    [image],
  );

  // Si el padre cambia el supplierId bloqueado (o el modal se reabre),
  // sincronizamos el state interno.
  React.useEffect(() => {
    if (lockedSupplierId) setSupplierId(lockedSupplierId);
  }, [lockedSupplierId, isOpen]);

  // Cada vez que se abre empieza una tanda nueva.
  React.useEffect(() => {
    if (isOpen) setAddedCount(0);
  }, [isOpen]);

  React.useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  // Deja el formulario limpio para el siguiente; el proveedor se conserva
  // (es lo que se repite cuando llega mercancía de una misma persona).
  const resetFields = () => {
    setTitle("");
    setPrice("");
    setQuantity(1);
    setImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (mode: SaveMode) => {
    if (saving) return;
    const priceValue = Number(price);
    if (!title.trim() || !(priceValue > 0) || !supplierId || (!isService && !(quantity > 0))) {
      toast.warning(
        isService
          ? "Título, precio y proveedor son obligatorios."
          : "Todos los campos son obligatorios, incluyendo el proveedor.",
      );
      return;
    }

    setSaving(mode);

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("price", String(priceValue));
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
        toast.error(message ?? (isService ? "Error creando servicio" : "Error creando producto"));
        return;
      }

      const product: Product = await res.json();
      onAdd(product);
      resetFields();

      if (mode === "another") {
        toast.success(`${product.title} agregado`);
        setAddedCount((n) => n + 1);
        // Listo para escribir el siguiente sin tocar el mouse.
        titleRef.current?.focus();
      } else {
        toast.success(isService ? "Servicio agregado" : "Producto agregado");
        setSupplierId(lockedSupplierId ?? "");
        onClose();
      }
    } catch {
      toast.error(isService ? "Error creando servicio" : "Error creando producto");
    } finally {
      setSaving(null);
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
        {/* Enter en cualquier campo = "Guardar y agregar otro", para
            capturar seguido con el teclado. */}
        <form
          id="add-product-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit("another");
          }}
          className="grid gap-4 py-4"
        >
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="supplier" className="text-right">
              Proveedor <span className="-ml-1 text-my-red">*</span>
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
              Título <span className="-ml-1 text-my-red">*</span>
            </Label>
            <Input
              ref={titleRef}
              id="title"
              value={title}
              placeholder={isService ? "Nombre del Servicio" : "Nombre del Producto"}
              onChange={(e) => setTitle(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="price" className="text-right">
              Precio <span className="-ml-1 text-my-red">*</span>
            </Label>
            <Input
              id="price"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={price}
              placeholder="0.00"
              onChange={(e) => setPrice(e.target.value)}
              className="col-span-3"
            />
          </div>
          {!isService && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity" className="text-right">
                Cantidad <span className="-ml-1 text-my-red">*</span>
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
        </form>

        {/* Leyenda en gris: avance de la tanda. */}
        {addedCount > 0 && (
          <p className="-mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Check className="h-3.5 w-3.5" />
            {addedCount}{" "}
            {isService
              ? addedCount === 1 ? "servicio agregado" : "servicios agregados"
              : addedCount === 1 ? "producto agregado" : "productos agregados"}{" "}
            en esta tanda
          </p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={!!saving}
            className="cursor-pointer sm:mr-auto"
          >
            {addedCount > 0 ? "Terminar" : "Cancelar"}
          </Button>
          <Button
            type="submit"
            form="add-product-form"
            variant="outline"
            disabled={!!saving}
            className="cursor-pointer"
          >
            {saving === "another" && <Loader2 className="animate-spin" />}
            Guardar y agregar otro
          </Button>
          <Button
            type="button"
            onClick={() => handleSubmit("close")}
            disabled={!!saving}
            className="cursor-pointer"
          >
            {saving === "close" && <Loader2 className="animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}