// app/(admin)/admin/dashboard/suppliers/_components/product-details-modal.tsx
"use client";

import * as React from "react";
import Image from "next/image";
import { type Product } from "@/lib/data";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  DollarSign,
  Edit,
  Package,
  PackageMinus,
  PackagePlus,
  PackageSearch,
  Pencil,
  RotateCcw,
  Save,
  ScanBarcode,
  Store,
  Trash2,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DeleteProductDialog } from "./delete-product-dialog";
import {
  StockMovementModal,
  type StockMovementKind,
} from "./stock-movement-modal";

interface ProductDetailsModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  supplierName?: string;
  clientName?: string;
  // Aviso al padre para que refresque (el supplier detail page hace re-fetch).
  onChanged?: () => void;
}

const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;

export function ProductDetailsModal({
  product,
  isOpen,
  onClose,
  supplierName = "Desconocido",
  clientName,
  onChanged,
}: ProductDetailsModalProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [pendingImage, setPendingImage] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [confirmPriceChange, setConfirmPriceChange] = React.useState(false);
  const [stockMovementKind, setStockMovementKind] =
    React.useState<StockMovementKind | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const reserved = product?.reservedCount ?? 0;
  const hasReservations = reserved > 0;
  const isRetirado = product?.status === "Retirado";
  const isService = product?.type === "SERVICE";
  const canEdit = !isRetirado;

  // Disponibilidad real = total menos lo apartado. Los servicios no llevan
  // inventario, así que ahí no aplica.
  const totalUnits = product?.quantity ?? 0;
  const availableUnits = Math.max(0, totalUnits - reserved);
  const isSoldOut = !isService && !isRetirado && availableUnits === 0;

  React.useEffect(() => {
    if (product) {
      setTitle(product.title);
      setPrice(String(product.price ?? ""));
      setPendingImage(null);
      setPreviewUrl(null);
      setError("");
    }
    setIsEditing(false);
  }, [product]);

  if (!product) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const doSave = async () => {
    setError("");
    setIsSaving(true);
    try {
      const body: Record<string, string | number> = {};
      if (title.trim() !== product.title) body.title = title.trim();
      if (!hasReservations) {
        if (price !== String(product.price)) {
          if (!MONEY_PATTERN.test(price)) {
            setError("El precio debe tener hasta dos decimales");
            return;
          }
          body.price = price;
        }
        // `quantity` no se manda nunca desde aquí: el stock se mueve sólo
        // agregando unidades o retirando mercancía.
      }

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
      }

      onChanged?.();
      setIsEditing(false);
      onClose();
    } catch {
      setError("No se pudo actualizar el producto");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveClick = () => {
    if (isSaving) return;
    if (!hasReservations && price !== String(product.price)) {
      setConfirmPriceChange(true);
      return;
    }
    doSave();
  };

  const handleDelete = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const { error: message } = await res.json();
        alert(message ?? "No se pudo retirar el producto");
        return;
      }
      onChanged?.();
      setShowDeleteDialog(false);
      onClose();
    } catch {
      alert("No se pudo retirar el producto");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestore = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/products/${product.id}/restore`, {
        method: "POST",
      });
      if (!res.ok) {
        const { error: message } = await res.json();
        alert(message ?? "No se pudo restaurar el producto");
        return;
      }
      onChanged?.();
      onClose();
    } catch {
      alert("No se pudo restaurar el producto");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setTitle(product.title);
    setPrice(String(product.price ?? ""));
    setPendingImage(null);
    setPreviewUrl(null);
    setError("");
    setIsEditing(false);
  };

  // Fondo -light con texto -dark, igual que las tags de la lista de productos.
  const getStatusClasses = (status: string) => {
    switch (status) {
      case "Disponible":
        return "bg-my-green-light text-my-green-dark";
      case "Apartado":
        return "bg-my-orange-light text-my-orange-dark";
      case "Vendido":
        return "bg-my-red-light text-my-red-dark";
      case "Retirado":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const displayedImage = previewUrl ?? product.photoUrl;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-5 sm:p-6">
          <DialogHeader>
            {/* pr-8 deja libre la X de cerrar. El título encoge (min-w-0 +
                flex-1) y se corta a dos líneas para que un nombre largo no
                empuje al badge ni estire el encabezado. */}
            <div className="flex items-start gap-3 pr-8">
              <DialogTitle className="min-w-0 flex-1 text-2xl font-bold leading-tight">
                {isEditing ? (
                  <Input
                    name="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    // md:text-2xl repite el tamaño porque el Input base trae
                    // text-base md:text-sm; sin el prefijo md: aquí, ese
                    // md:text-sm gana en pantallas ≥768px y el campo se ve
                    // más chico que el resto de las etiquetas de solo lectura.
                    className="text-2xl font-bold h-auto md:text-2xl"
                  />
                ) : (
                  <span
                    className="line-clamp-2 wrap-break-word"
                    title={product.title}
                  >
                    {product.title}
                  </span>
                )}
              </DialogTitle>
              {/* Visible también en edición: si desaparece, el encabezado da
                  un salto de layout al entrar y salir del modo editar. */}
              <Badge
                className={cn("mt-1 shrink-0", getStatusClasses(product.status))}
              >
                {product.status}
              </Badge>
            </div>
            {/* Subtítulo: proveedor */}
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Store className="h-4 w-4" />
              <span>{supplierName}</span>
            </div>
          </DialogHeader>

          {/* Las alertas de inventario (apartados, sin stock, stock bajo) no
              viven aquí: van debajo del campo de Unidades, que es lo que
              describen. Ésta sí es de producto entero. */}
          {isRetirado && (
            <div className="flex items-start gap-3 rounded-lg bg-muted p-3 text-muted-foreground">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  Producto Retirado
                </p>
                <p className="mt-1 text-xs">
                  Este producto ya no aparece en el inventario. Restáuralo para
                  volver a editarlo.
                </p>
              </div>
            </div>
          )}

          <div className="grid gap-2 lg:grid-cols-[1fr_1fr]">
            <div className="flex flex-col gap-2">
              <div className="relative aspect-square w-full max-w-84 h-84 overflow-hidden rounded-3xl bg-muted">
                <div className="absolute inset-0">
                  {displayedImage ? (
                    <Image
                      src={displayedImage}
                      alt={product.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Package className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}
                </div>
                {/* Superpuesto sobre la foto, no debajo, para no crecer la
                    altura del modal al entrar en edición. */}
                {isEditing && canEdit && (
                  <div className="absolute inset-x-3 bottom-3 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="cursor-pointer bg-background/90 shadow-md backdrop-blur-sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Pencil />
                      Cambiar foto
                    </Button>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-[110px_1fr] items-center gap-3">
                <Label className="flex items-center gap-2 text-xl font-normal">
                  Precio
                </Label>
                {isEditing ? (
                  <Input
                    name="price"
                    type="text"
                    inputMode="decimal"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    disabled={hasReservations || !canEdit}
                    className="h-12 rounded-2xl text-xl font-normal px-4 disabled:opacity-60 md:text-xl"
                  />
                ) : (
                  <div className="h-12 rounded-2xl border px-4 flex items-center text-xl">
                    ${product.price.toFixed(2)}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-[110px_1fr] items-center gap-3">
                <Label className="flex items-center gap-2 text-xl font-normal">
                  {isService ? "Tipo" : "Unidades"}
                </Label>
                {isService ? (
                  <div className="h-12 rounded-2xl border px-4 flex items-center text-xl">
                    Servicio
                  </div>
                ) : (
                  // Nunca editable, ni en modo edición. El stock sólo se mueve
                  // agregando unidades o retirando mercancía.
                  //
                  // El número grande es lo vendible, no el total: con apartados
                  // el total engaña sobre lo que realmente se puede vender.
                  <div className="flex h-12 items-center justify-between gap-2 rounded-2xl border px-4 text-xl">
                    {hasReservations ? (
                      <>
                        <span className="truncate">
                          {availableUnits}
                          <span className="ml-1.5 text-sm text-muted-foreground">
                            de {totalUnits}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-full bg-my-orange-light px-2.5 py-0.5 text-xs font-semibold text-my-orange-dark">
                          {reserved} {reserved === 1 ? "apartada" : "apartadas"}
                        </span>
                      </>
                    ) : (
                      <span>{totalUnits}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Alertas de inventario, pegadas al campo que describen.
                  Ocupan el ancho completo de la columna derecha. */}
              {hasReservations && (
                <div className="flex items-start gap-3 rounded-lg bg-my-orange-light p-3 text-my-orange-dark">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {reserved}{" "}
                      {reserved === 1 ? "unidad apartada" : "unidades apartadas"}
                      {!isService && (
                        <>
                          {" · quedan "}
                          {availableUnits}{" "}
                          {availableUnits === 1 ? "disponible" : "disponibles"}
                        </>
                      )}
                    </p>
                    {clientName && (
                      <div className="mt-0.5 flex items-center gap-2">
                        <User className="h-3 w-3" />
                        <p className="text-xs">Cliente: {clientName}</p>
                      </div>
                    )}
                    <p className="mt-1 text-xs">
                      No se puede modificar el precio hasta liberar los
                      apartados.
                    </p>
                  </div>
                </div>
              )}

              {/* Sin apartados pero sin stock libre: no es vendible. */}
              {!hasReservations && isSoldOut && (
                <div className="flex items-start gap-3 rounded-lg bg-my-red-light p-3 text-my-red-dark">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      Sin unidades disponibles
                    </p>
                    <p className="mt-1 text-xs">
                      Agrega unidades para volver a ponerlo en circulación.
                    </p>
                  </div>
                </div>
              )}

              {/* Únicas dos formas de mover stock. Sólo en modo edición. */}
              {isEditing && !isService && !isRetirado && (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    onClick={() => setStockMovementKind("Alta")}
                  >
                    <PackagePlus />
                    Agregar unidades
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={availableUnits === 0}
                    className="cursor-pointer"
                    onClick={() => setStockMovementKind("Retiro")}
                  >
                    <PackageMinus />
                    Retirar mercancía
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-[110px_1fr] items-center gap-3">
                <Label className="flex items-center gap-2 text-xl font-normal">
                  Código
                </Label>
                <div className="h-12 rounded-2xl border px-4 flex items-center text-base font-mono overflow-hidden">
                  <span className="truncate">{product.barcode ?? "—"}</span>
                </div>
              </div>

              {/*<div className="grid grid-cols-[110px_1fr] items-center gap-3">
                <Label className="flex items-center gap-2 text-xl font-normal">
                  Id
                </Label>
                <div className="h-12 rounded-2xl border px-4 flex items-center text-sm font-mono overflow-hidden">
                  <span className="truncate">{product.id}</span>
                </div>
              </div>*/}

              {clientName && (
                <div className="grid grid-cols-[110px_1fr] items-center gap-3">
                  <Label className="flex items-center gap-2 text-xl font-normal">
                    <User className="h-5 w-5" />
                    Cliente
                  </Label>
                  <div className="h-12 rounded-2xl border px-4 flex items-center text-base overflow-hidden">
                    <span className="truncate">{clientName}</span>
                  </div>
                </div>
              )}

            </div>
          </div>

          {error && (
            <div className="flex items-start gap-3 rounded-lg bg-my-red-light p-3 text-my-red-dark">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <Separator className="my-2" />

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {isRetirado ? (
              <>
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="cursor-pointer w-full sm:w-auto"
                >
                  Cerrar
                </Button>
                <Button
                  onClick={handleRestore}
                  disabled={isSaving}
                  className="cursor-pointer w-full sm:w-auto"
                >
                  <RotateCcw />
                  Restaurar producto
                </Button>
              </>
            ) : isEditing ? (
              <>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isSaving}
                  className="cursor-pointer mr-auto"
                >
                  {/* "Eliminar producto" y no "Retirar": este botón da de
                      baja TODO el producto (todas las unidades, fuera del
                      catálogo), a diferencia de "Retirar mercancía", que sólo
                      descuenta parte del stock. Mismo verbo para dos acciones
                      muy distintas confundía. */}
                  <Trash2 />
                  Eliminar producto
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="cursor-pointer w-full sm:w-auto"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveClick}
                  disabled={isSaving}
                  className="cursor-pointer w-full sm:w-auto"
                >
                  <Save />
                  {isSaving ? "Guardando..." : "Guardar cambios"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => setIsEditing(true)}
                  disabled={!canEdit}
                  className="cursor-pointer w-full sm:w-auto"
                >
                  <Edit />
                  Editar producto
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteProductDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        product={product}
        onDelete={handleDelete}
      />

      {stockMovementKind && (
        <StockMovementModal
          isOpen={stockMovementKind !== null}
          onClose={() => setStockMovementKind(null)}
          product={product}
          kind={stockMovementKind}
          onDone={() => {
            onChanged?.();
            onClose();
          }}
        />
      )}

      <AlertDialog
        open={confirmPriceChange}
        onOpenChange={(open) => {
          if (!open) setConfirmPriceChange(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar cambio de precio?</AlertDialogTitle>
            <AlertDialogDescription>
              Cambiar el precio puede afectar apartados futuros y reportes de
              ventas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmPriceChange(false);
                doSave();
              }}
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
