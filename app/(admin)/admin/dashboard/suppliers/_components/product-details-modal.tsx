// app/(admin)/admin/dashboard/suppliers/_components/product-details-modal.tsx
"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { type Product } from "@/lib/data";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  Package,
  DollarSign,
  ScanBarcode,
  Store,
  Edit,
  AlertCircle,
  User,
  PackageSearch,
  Trash2,
  Pencil,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DeleteProductDialog } from "./delete-product-dialog";

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
  const router = useRouter();
  const [isEditing, setIsEditing] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [quantity, setQuantity] = React.useState("0");
  const [pendingImage, setPendingImage] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [confirmPriceChange, setConfirmPriceChange] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const hasReservations = (product?.reservedCount ?? 0) > 0;
  const isRetirado = product?.status === "Retirado";
  const isService = product?.type === "SERVICE";
  const canEdit = !isRetirado;

  React.useEffect(() => {
    if (product) {
      setTitle(product.title);
      setPrice(String(product.price ?? ""));
      setQuantity(String(product.quantity ?? 0));
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
        if (!isService && Number(quantity) !== Number(product.quantity)) {
          body.quantity = Number(quantity);
        }
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
    setQuantity(String(product.quantity ?? 0));
    setPendingImage(null);
    setPreviewUrl(null);
    setError("");
    setIsEditing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Disponible":
        return "bg-green-500";
      case "Apartado":
        return "bg-amber-500";
      case "Vendido":
        return "bg-rose-500";
      case "Retirado":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const handleGoToInventory = () => {
    router.push("/admin/dashboard/inventory");
    onClose();
  };

  const displayedImage = previewUrl ?? product.photoUrl;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <DialogTitle className="text-2xl font-bold">
                {isEditing ? (
                  <Input
                    name="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="text-2xl font-bold h-auto"
                  />
                ) : (
                  product.title
                )}
              </DialogTitle>
              {!isEditing && (
                <Badge
                  className={cn("text-white", getStatusColor(product.status))}
                >
                  {product.status}
                </Badge>
              )}
            </div>
          </DialogHeader>

          {hasReservations && (
            <div className="flex items-center gap-2 p-3 bg-amber-100 text-amber-600 rounded-lg">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <div className="flex-1 min-w-0 pl-1">
                <p className="text-sm font-semibold">
                  {product.reservedCount}{" "}
                  {product.reservedCount === 1
                    ? "unidad apartada"
                    : "unidades apartadas"}
                </p>
                {clientName && (
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3" />
                    <p className="text-xs">Cliente: {clientName}</p>
                  </div>
                )}
                <p className="text-xs mt-1">
                  No se puede modificar precio ni cantidad hasta liberar los apartados.
                </p>
              </div>
            </div>
          )}

          {isRetirado && (
            <div className="flex items-center gap-2 p-3 bg-gray-100 text-gray-700 rounded-lg">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <div className="flex-1 min-w-0 pl-1">
                <p className="text-sm font-semibold">Producto Retirado</p>
                <p className="text-xs">
                  Este producto ya no aparece en el inventario. Restáuralo para
                  volver a editarlo.
                </p>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-4">
              <div className="relative group shrink-0">
                <div className="relative aspect-square rounded-xl overflow-hidden bg-muted">
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
                {isEditing && canEdit && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute -bottom-2 -right-2 rounded-full h-8 w-8 cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </>
                )}
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-100 text-gray-600 rounded-lg shrink-0">
                <div className="p-2 rounded-lg">
                  <PackageSearch className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs">Id del Producto</p>
                  <p className="text-md font-semibold truncate">{product.id}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="relative overflow-hidden rounded-xl border border-green-500 bg-linear-to-br from-green-400 to-green-600 py-4 px-6 text-white shrink-0">
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-5 w-5" />
                    <Label className="text-sm font-semibold">Precio</Label>
                  </div>
                  {isEditing ? (
                    <Input
                      name="price"
                      type="text"
                      inputMode="decimal"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      disabled={hasReservations || !canEdit}
                      className="text-4xl font-bold bg-transparent text-white border-white/20 h-auto disabled:opacity-60"
                    />
                  ) : (
                    <p className="text-4xl font-bold">
                      ${product.price.toFixed(2)}
                    </p>
                  )}
                  <p className="text-sm opacity-75 mt-1">MXN</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-sky-100 text-sky-600 rounded-lg shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg">
                    <Package className="h-6 w-6" />
                  </div>
                  <div>
                    {isService ? (
                      <>
                        <Label className="text-xs">Tipo</Label>
                        <p className="text-md font-bold">Servicio (sin inventario)</p>
                      </>
                    ) : (
                      <>
                        <Label className="text-xs">Stock disponible</Label>
                        {isEditing ? (
                          <Input
                            name="quantity"
                            type="number"
                            min={0}
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            disabled={hasReservations || !canEdit}
                            className="text-md font-bold h-8 disabled:opacity-60"
                          />
                        ) : (
                          <p className="text-md font-bold">
                            {product.quantity}{" "}
                            {product.quantity === 1 ? "Unidad" : "Unidades"}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
                {!isEditing && !isService &&
                  product.quantity < 5 &&
                  product.status === "Disponible" && (
                    <Badge variant="destructive" className="text-xs">
                      Stock bajo
                    </Badge>
                  )}
              </div>

              {product.barcode && (
                <div className="flex items-center gap-3 p-4 bg-purple-100 text-purple-600 rounded-lg shrink-0">
                  <div className="p-2 rounded-lg">
                    <ScanBarcode className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Label className="text-xs">Código</Label>
                    <p className="text-md font-mono font-semibold truncate">
                      {product.barcode}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 p-4 bg-rose-100 text-rose-600 rounded-lg shrink-0">
                <div className="p-2 rounded-lg">
                  <Store className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs">Proveedor</p>
                  <p className="text-md font-semibold truncate">
                    {supplierName}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm font-medium text-red-600">{error}</p>
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
                  <RotateCcw className="mr-2 h-4 w-4" />
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
                  <Trash2 className="mr-2 h-4 w-4" />
                  Retirar
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
                  {isSaving ? "Guardando..." : "Guardar cambios"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="cursor-pointer w-full sm:w-auto"
                >
                  Cerrar
                </Button>
                <Button
                  onClick={() => setIsEditing(true)}
                  disabled={!canEdit}
                  className="cursor-pointer w-full sm:w-auto"
                >
                  <Edit className="mr-2 h-4 w-4" />
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
