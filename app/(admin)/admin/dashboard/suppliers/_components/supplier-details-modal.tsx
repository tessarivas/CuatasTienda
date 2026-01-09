"use client";

import * as React from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { type Supplier } from "./supplier-card";
import { Mail, Phone, User, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SupplierDetailsModalProps {
  supplier: Supplier | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedSupplier: Supplier) => void;
  onDelete: (supplierId: string) => void;
}

export function SupplierDetailsModal({
  supplier,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: SupplierDetailsModalProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedSupplier, setEditedSupplier] = React.useState<Supplier | null>(
    supplier
  );
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setEditedSupplier(supplier);
    setIsEditing(false);
  }, [supplier]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editedSupplier) return;
    const { name, value } = e.target;
    setEditedSupplier({ ...editedSupplier, [name]: value });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && editedSupplier) {
      const file = e.target.files[0];
      const newLogoUrl = URL.createObjectURL(file);
      setEditedSupplier({ ...editedSupplier, logo: newLogoUrl });
    }
  };

  const handleSave = () => {
    if (editedSupplier) {
      onSave(editedSupplier);
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    if (
      supplier &&
      window.confirm(
        `¿Estás seguro de que quieres eliminar a ${supplier.businessName}?`
      )
    ) {
      onDelete(supplier.id);
    }
  };

  if (!supplier) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <div className="relative">
            <Image
              src={editedSupplier?.logo || supplier.logo}
              alt={`Logo de ${supplier.businessName}`}
              width={100}
              height={100}
              className="object-cover aspect-square mb-4"
            />
            {isEditing && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute bottom-4 -right-2 rounded-full h-8 w-8 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Pencil className="size-4" />
                  <span className="sr-only">Editar logo</span>
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
          <DialogTitle className="text-2xl font-bold">
            {isEditing ? (
              <Input
                name="businessName"
                value={editedSupplier?.businessName || ""}
                onChange={handleInputChange}
                className="text-center text-2xl font-bold"
              />
            ) : (
              supplier.businessName
            )}
          </DialogTitle>
        </DialogHeader>
        <Separator />
        <div className="py-4 space-y-4">
          {isEditing ? (
            <>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="providerName">Nombre del proveedor</Label>
                <Input
                  id="providerName"
                  name="providerName"
                  value={editedSupplier?.providerName || ""}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={editedSupplier?.phone || ""}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="email">Correo</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={editedSupplier?.email || ""}
                  onChange={handleInputChange}
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center">
                <User className="size-5 mr-3 text-muted-foreground" />
                <span className="font-medium">{supplier.providerName}</span>
              </div>
              <div className="flex items-center">
                <Phone className="size-5 mr-3 text-muted-foreground" />
                <span className="font-medium">{supplier.phone}</span>
              </div>
              <div className="flex items-center">
                <Mail className="size-5 mr-3 text-muted-foreground" />
                <span className="font-medium">{supplier.email}</span>
              </div>
            </>
          )}
        </div>
        <Separator />
        <DialogFooter className="mt-4">
          {isEditing ? (
            <div className="flex w-full flex-col-reverse sm:flex-row sm:justify-between gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                className="w-full sm:w-auto cursor-pointer"
              >
                Cancelar
              </Button>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  className="w-full sm:w-auto cursor-pointer"
                >
                  Eliminar Proveedor
                </Button>
                <Button
                  onClick={handleSave}
                  className="w-full sm:w-auto cursor-pointer"
                >
                  Guardar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex w-full flex-col-reverse sm:flex-row sm:justify-between gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="w-full sm:w-auto cursor-pointer"
              >
                Cerrar
              </Button>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    window.location.href = `/admin/dashboard/products?supplierId=${supplier.id}`;
                  }}
                  className="w-full sm:w-auto cursor-pointer"
                >
                  Ver Productos
                </Button>
                <Button
                  onClick={() => setIsEditing(true)}
                  className="w-full sm:w-auto cursor-pointer"
                >
                  Editar Información
                </Button>
              </div>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
