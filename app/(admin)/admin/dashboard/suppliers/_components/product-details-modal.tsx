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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DeleteProductDialog } from "./delete-product-dialog";

interface ProductDetailsModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  supplierName?: string; // Nombre del proveedor
  clientName?: string; // Nombre del cliente (si está apartado)
}

export function ProductDetailsModal({
  product,
  isOpen,
  onClose,
  supplierName = "Desconocido",
  clientName,
}: ProductDetailsModalProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedProduct, setEditedProduct] = React.useState<Product | null>(
    product,
  );
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setEditedProduct(product);
    // Salir del modo edición si el producto cambia (ej: al abrir otro modal)
    setIsEditing(false);
  }, [product]);

  if (!product) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editedProduct) return;
    const { name, value } = e.target;
    setEditedProduct({ ...editedProduct, [name]: value });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && editedProduct) {
      const file = e.target.files[0];
      const newPhotoUrl = URL.createObjectURL(file);
      setEditedProduct({ ...editedProduct, photoUrl: newPhotoUrl });
    }
  };

  const handleSave = () => {
    // Aquí iría la lógica para guardar en la base de datos
    console.log("Guardando producto:", editedProduct);
    // Por ahora, solo actualizamos el estado localmente
    // onUpdateProduct(editedProduct); // Deberías pasar una función para actualizar el estado padre
    setIsEditing(false);
  };

  const handleDelete = () => {
    // Aquí iría la lógica para eliminar de la base de datos
    console.log("Eliminando producto:", product?.id);
    setShowDeleteDialog(false);
    onClose(); // Cierra el modal principal
  };

  const handleCancel = () => {
    setEditedProduct(product);
    setIsEditing(false);
  };

  // Determinar color del badge según el estado
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Disponible":
        return "bg-green-500";
      case "Apartado":
        return "bg-amber-500";
      case "Vendido":
        return "bg-rose-500";
      default:
        return "bg-gray-500";
    }
  };

  const handleGoToProduct = () => {
    router.push(`/admin/dashboard/inventory/${product.id}`);
    onClose();
  };

  const handleGoToInventory = () => {
    router.push("/admin/dashboard/inventory");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle className="text-2xl font-bold">
              {isEditing ? (
                <Input
                  name="title"
                  value={editedProduct?.title || ""}
                  onChange={handleInputChange}
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

        {/* Banner de apartado (fuera del grid para no afectar altura) */}
        {product.status === "Apartado" && (
          <div className="flex items-center gap-2 p-3 bg-amber-100 text-amber-600 rounded-lg">
            <AlertCircle className="h-5 w-5 not-[]:shrink-0" />
            <div className="flex-1 min-w-0 pl-1">
              <p className="text-sm font-semibold">Producto Apartado</p>
              <div className="flex items-center gap-2">
                <User className="h-3 w-3" />
                <p className="text-xs">
                  Cliente: {clientName || `ID: ${product.clientId}`}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Columna Izquierda - Imagen */}
          <div className="flex flex-col gap-4">
            {/* Imagen principal */}
            <div className="relative group shrink-0">
              <div className="relative aspect-square rounded-xl overflow-hidden">
                <Image
                  src={editedProduct?.photoUrl || product.photoUrl}
                  alt={product.title}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder-product.png";
                  }}
                />
              </div>
              {isEditing && (
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

            {/* ID del producto */}
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

          {/* Columna Derecha - Información */}
          <div className="flex flex-col gap-4">
            {/* Precio destacado */}
            <div className="relative overflow-hidden rounded-xl border border-green-500 bg-linear-to-br from-green-400 to-green-600 py-4 px-6 text-white shrink-0">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-5 w-5" />
                  <Label className="text-sm font-semibold">Precio</Label>
                </div>
                {isEditing ? (
                  <Input
                    name="price"
                    type="number"
                    value={editedProduct?.price || 0}
                    onChange={handleInputChange}
                    className="text-4xl font-bold bg-transparent text-white border-white/20 h-auto"
                  />
                ) : (
                  <p className="text-4xl font-bold">
                    ${product.price.toFixed(2)}
                  </p>
                )}
                <p className="text-sm opacity-75 mt-1">MXN</p>
              </div>
            </div>

            {/* Stock */}
            <div className="flex items-center justify-between p-4 bg-sky-100 text-sky-600 rounded-lg shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg">
                  <Package className="h-6 w-6" />
                </div>
                <div>
                  <Label className="text-xs">Stock disponible</Label>
                  {isEditing ? (
                    <Input
                      name="quantity"
                      type="number"
                      value={editedProduct?.quantity || 0}
                      onChange={handleInputChange}
                      className="text-md font-bold h-8"
                    />
                  ) : (
                    <p className="text-md font-bold">
                      {product.quantity}{" "}
                      {product.quantity === 1 ? "Unidad" : "Unidades"}
                    </p>
                  )}
                </div>
              </div>
              {!isEditing &&
                product.quantity < 5 &&
                product.status === "Disponible" && (
                  <Badge variant="destructive" className="text-xs">
                    Stock bajo
                  </Badge>
                )}
            </div>

            {/* Código de barras */}
            {product.barcode && (
              <div className="flex items-center gap-3 p-4 bg-purple-100 text-purple-600 rounded-lg shrink-0">
                <div className="p-2 rounded-lg">
                  <ScanBarcode className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <Label className="text-xs">Código de barras</Label>
                  {isEditing ? (
                    <Input
                      name="barcode"
                      value={editedProduct?.barcode || ""}
                      onChange={handleInputChange}
                      className="text-md font-mono font-semibold h-8"
                    />
                  ) : (
                    <p className="text-md font-mono font-semibold truncate">
                      {product.barcode}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Proveedor */}
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

        <Separator className="my-2" />

        {/* Footer con acciones */}
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {isEditing ? (
            <>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                className="cursor-pointer mr-auto"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                className="cursor-pointer w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                className="cursor-pointer w-full sm:w-auto"
              >
                Guardar Cambios
              </Button>
            </>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="cursor-pointer w-full sm:w-auto"
                >
                  Cerrar
                </Button>
              </div>
              <Button
                onClick={() => setIsEditing(true)}
                className="cursor-pointer w-full sm:w-auto"
              >
                <Edit className="mr-2 h-4 w-4" />
                Editar Producto
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
      <DeleteProductDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        product={product}
        onDelete={handleDelete}
      />
    </Dialog>
  );
}
