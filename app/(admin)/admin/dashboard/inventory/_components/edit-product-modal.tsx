"use client";

import * as React from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil } from "lucide-react";
import { type Product, type Supplier } from "@/lib/data";

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedProduct: Product) => void;
  product: Product | null;
  suppliers: Supplier[];
}

export function EditProductModal({
  isOpen,
  onClose,
  onSave,
  product,
  suppliers,
}: EditProductModalProps) {
  const [title, setTitle] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [quantity, setQuantity] = React.useState("0");
  const [supplierId, setSupplierId] = React.useState("");
  const [pendingImage, setPendingImage] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [pendingConfirm, setPendingConfirm] = React.useState<{
    priceChanged: boolean;
    supplierChanged: boolean;
  } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Con reservas activas (apartados) los campos sensibles quedan congelados.
  const hasReservations = (product?.reservedCount ?? 0) > 0;

  React.useEffect(() => {
    if (product) {
      setTitle(product.title);
      setPrice(String(product.price ?? ""));
      setQuantity(String(product.quantity ?? 0));
      setSupplierId(String(product.supplierId ?? ""));
      setPendingImage(null);
      setPreviewUrl(null);
      setError("");
    }
  }, [product]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const doSave = async () => {
    if (!product) return;
    setError("");
    setIsSaving(true);
    try {
      const body: Record<string, string | number> = {};
      if (title.trim() !== product.title) body.title = title.trim();
      if (!hasReservations) {
        if (price !== String(product.price)) body.price = price;
        if (Number(quantity) !== Number(product.quantity))
          body.quantity = Number(quantity);
        if (supplierId !== String(product.supplierId))
          body.supplierId = Number(supplierId);
      }

      let updated: Product = product;

      if (Object.keys(body).length > 0) {
        const res = await fetch(`/api/products/${product.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const { error: message } = await res.json();
          setError(message ?? "No se pudo actualizar el producto");
          return;
        }
        updated = await res.json();
      }

      if (pendingImage) {
        const formData = new FormData();
        formData.append("file", pendingImage);
        const imgRes = await fetch(`/api/products/${product.id}`, {
          method: "POST",
          body: formData,
        });
        if (!imgRes.ok) {
          const { error: message } = await imgRes.json();
          setError(message ?? "No se pudo subir la nueva foto");
          return;
        }
        updated = await imgRes.json();
      }

      onSave(updated);
      onClose();
    } catch {
      setError("No se pudo actualizar el producto");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveClick = () => {
    if (!product || isSaving) return;

    const priceChanged = !hasReservations && price !== String(product.price);
    const supplierChanged =
      !hasReservations && supplierId !== String(product.supplierId);

    if (priceChanged || supplierChanged) {
      setPendingConfirm({ priceChanged, supplierChanged });
      return;
    }

    doSave();
  };

  const confirmDangerous = () => {
    setPendingConfirm(null);
    doSave();
  };

  if (!product) return null;

  const displayedImage = previewUrl ?? product.photoUrl;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Editar Producto</DialogTitle>
            <DialogDescription>
              Actualiza los datos del producto. El código no se puede modificar.
            </DialogDescription>
          </DialogHeader>

          {hasReservations && (
            <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900">
              Este producto tiene {product.reservedCount}{" "}
              {product.reservedCount === 1 ? "unidad apartada" : "unidades apartadas"}.
              Para modificar precio, cantidad o proveedor, libera esos apartados primero.
            </div>
          )}

          <div className="grid gap-4 py-2">
            <div className="flex justify-center">
              <div className="relative">
                {displayedImage ? (
                  <Image
                    src={displayedImage}
                    alt={product.title}
                    width={96}
                    height={96}
                    className="rounded-md object-cover aspect-square border"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-md border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                    Sin foto
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="absolute -bottom-2 -right-2 rounded-full h-8 w-8 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Pencil className="h-4 w-4" />
                  <span className="sr-only">Cambiar foto</span>
                </Button>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price">Precio</Label>
                <Input
                  id="price"
                  type="text"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  disabled={hasReservations}
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="quantity">Cantidad</Label>
                <Input
                  id="quantity"
                  type="number"
                  min={0}
                  step={1}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  disabled={hasReservations}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="supplier">Proveedor</Label>
              <Select
                value={supplierId}
                onValueChange={setSupplierId}
                disabled={hasReservations}
              >
                <SelectTrigger id="supplier">
                  <SelectValue placeholder="Selecciona un proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.businessName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <p className="text-sm font-medium text-red-600">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
              className="cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveClick}
              disabled={isSaving}
              className="cursor-pointer"
            >
              {isSaving ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pendingConfirm !== null}
        onOpenChange={(open) => {
          if (!open) setPendingConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar cambios sensibles?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingConfirm?.priceChanged && (
                <span className="block">
                  Cambiar el precio puede afectar apartados futuros y reportes
                  de ventas.
                </span>
              )}
              {pendingConfirm?.supplierChanged && (
                <span className="block mt-1">
                  Cambiar el proveedor reasignará este producto al nuevo
                  proveedor para cortes futuros.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDangerous}
              className="cursor-pointer"
            >
              Sí, guardar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
