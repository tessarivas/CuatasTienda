// app/(admin)/admin/dashboard/suppliers/_components/product-details-modal.tsx
"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { type Product } from "@/lib/data";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  PackageSearch,
  Pencil,
  ScanBarcode,
  Store,
  Trash2,
  User,
  ImageOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DeleteProductDialog } from "./delete-product-dialog";

interface ProductDetailsModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  supplierName?: string;
  clientName?: string;
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
    console.log("Guardando producto:", editedProduct);
    setIsEditing(false);
  };

  const handleDelete = () => {
    console.log("Eliminando producto:", product?.id);
    setShowDeleteDialog(false);
    onClose();
  };

  const handleCancel = () => {
    setEditedProduct(product);
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
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle className="text-2xl font-bold flex-1">
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
                className={cn("text-white shrink-0", getStatusColor(product.status))}
              >
                {product.status}
              </Badge>
            )}
          </div>
          {/* Subtítulo proveedor */}
           <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Store className="h-4 w-4" />
              <span>{supplierName}</span>
           </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* 1. IMAGEN (col-span-3row-span-4) */}
          <div className="col-span-3 row-span-4 relative group w-full h-full min-h-62.5 aspect-square md:aspect-auto rounded-xl overflow-hidden bg-muted border-2 border-muted flex items-center justify-center">
            
            {(editedProduct?.photoUrl || product.photoUrl) ? (
              <Image
                src={editedProduct?.photoUrl || product.photoUrl}
                alt={product.title}
                fill
                sizes="(max-width: 768px) 100vw, 300px"
                className="object-cover"
                onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement?.classList.add('image-error');
                }}
              />
            ) : (
                <ImageOff className="h-12 w-12 text-muted-foreground/50" />
            )}
            
            <div className="hidden in-[.image-error]:flex items-center justify-center w-full h-full absolute inset-0">
                <ImageOff className="h-12 w-12 text-muted-foreground/50" />
            </div>

            {isEditing && (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute bottom-2 right-2 rounded-full h-10 w-10 cursor-pointer shadow-md z-10"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Pencil className="h-5 w-5" />
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

          {/* 2. PRECIO (col-start-4 - span para llenar ancho) */}
          <div className="col-span-4 md:col-start-4 relative overflow-hidden rounded-xl border border-green-500 bg-linear-to-br from-green-400 to-green-600 p-4 text-white shadow-sm flex items-center justify-between">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1 opacity-90">
                <DollarSign className="h-4 w-4" />
                <Label className="text-xs font-semibold uppercase tracking-wider">Precio</Label>
              </div>
              {isEditing ? (
                <Input
                  name="price"
                  type="number"
                  value={editedProduct?.price || 0}
                  onChange={handleInputChange}
                  className="text-3xl font-bold bg-white/20 text-white border-white/40 h-10 w-full"
                />
              ) : (
                <p className="text-3xl font-bold tracking-tight">
                  ${Number(product.price).toFixed(2)}
                </p>
              )}
            </div>
             <p className="text-xs font-medium opacity-75 self-end">MXN</p>
          </div>

          {/* 3. STOCK (col-start-4 row-start-2 - span 4 para llenar ancho) */}
          <div className="col-span-4 md:col-start-4 md:row-start-2 flex items-center justify-between p-3 bg-sky-50 text-sky-700 rounded-lg border border-sky-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sky-100 rounded-lg shrink-0">
                <Package className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <Label className="text-xs text-sky-600/80 block">Stock disponible</Label>
                {isEditing ? (
                  <Input
                    name="quantity"
                    type="number"
                    value={editedProduct?.quantity || 0}
                    onChange={handleInputChange}
                    className="text-md font-bold h-7 w-20 bg-white"
                  />
                ) : (
                  <p className="text-lg font-bold leading-none">
                    {product.quantity}{" "}
                    <span className="text-xs font-normal text-sky-600/70">unid.</span>
                  </p>
                )}
              </div>
            </div>
            {!isEditing &&
              product.quantity < 5 &&
              product.status === "Disponible" && (
                <Badge variant="destructive" className="text-xs animate-pulse">
                  Bajo
                </Badge>
              )}
          </div>

          {/* 4. CÓDIGO DE BARRAS (col-start-4 row-start-3 - span 4) */}
          <div className="col-span-4 md:col-start-4 md:row-start-3 flex items-center gap-3 p-3 bg-purple-50 text-purple-700 rounded-lg border border-purple-100">
            <div className="p-2 bg-purple-100 rounded-lg shrink-0">
              <ScanBarcode className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <Label className="text-xs text-purple-600/80 block">Código de barras</Label>
              {isEditing ? (
                <Input
                  name="barcode"
                  value={editedProduct?.barcode || ""}
                  onChange={handleInputChange}
                  className="text-sm font-mono font-semibold h-7 bg-white w-full"
                  placeholder="Sin código"
                />
              ) : (
                <p className="text-sm font-mono font-semibold truncate text-purple-900">
                  {product.barcode || "N/A"}
                </p>
              )}
            </div>
          </div>

          {/* 5. ID DEL PRODUCTO (col-start-4 row-start-4 - span 4) */}
          <div className="col-span-4 md:col-start-4 md:row-start-4 flex items-center gap-3 p-3 bg-gray-100 text-gray-600 rounded-lg border border-gray-200">
            <div className="p-2 bg-white rounded-lg shrink-0">
              <PackageSearch className="h-5 w-5 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <Label className="text-xs text-gray-500 block">ID del Producto</Label>
              <p className="text-xs font-mono font-medium truncate select-all" title={product.id}>
                {product.id}
              </p>
            </div>
          </div>

           {/* 6. APARTADO / INFO EXTRA (col-span-5 row-start-5 - FILA INFERIOR COMPLETA) */}
           {product.status === "Apartado" && (
            <div className="col-span-5 row-start-5 flex items-center gap-3 p-3 bg-amber-50 text-amber-700 rounded-lg border border-amber-200">
                <div className="p-2 bg-amber-100 rounded-full shrink-0">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-amber-800">Producto Apartado</p>
                    <div className="flex items-center gap-2 mt-0.5">
                        <User className="h-3 w-3 opacity-70" />
                        <p className="text-xs opacity-90 truncate">
                            Cliente: <span className="font-medium">{clientName || "Desconocido"}</span> 
                            {!clientName && <span className="text-xs opacity-70 ml-1">({product.clientId})</span>}
                        </p>
                    </div>
                </div>
            </div>
           )}

        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 mt-2">
          {isEditing ? (
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                className="cursor-pointer sm:mr-auto"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </Button>
              <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    className="cursor-pointer flex-1 sm:flex-none"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSave}
                    className="cursor-pointer flex-1 sm:flex-none"
                  >
                    Guardar Cambios
                  </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row justify-between w-full gap-2">
                 <Button
                  variant="outline"
                  onClick={onClose}
                  className="cursor-pointer order-2 sm:order-1"
                >
                  Cerrar
                </Button>
                <Button
                    onClick={() => setIsEditing(true)}
                    className="cursor-pointer order-1 sm:order-2"
                >
                    <Edit className="mr-2 h-4 w-4" />
                    Editar Producto
                </Button>
            </div>
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
