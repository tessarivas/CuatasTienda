"use client";

import * as React from "react";
import Image from "next/image";
import { type Supplier } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, User, Pencil, ArrowLeft, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface SupplierDetailsFormProps {
  supplier: Supplier;
  editedSupplier: Supplier | null;
  isEditing: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function SupplierDetailsForm({
  supplier,
  editedSupplier,
  isEditing,
  onInputChange,
  onImageChange,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  fileInputRef,
}: SupplierDetailsFormProps) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <CardTitle>
            {isEditing ? "Editar Proveedor" : "Detalles del Proveedor"}
          </CardTitle>
        </div>
        {!isEditing && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="cursor-pointer"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-8">
          {/* Columna del Logo */}
          <div className="flex flex-col items-center gap-4 py-6 lg:border-r lg:pr-8">
            <div className="relative">
              <Image
                src={supplier.logo}
                alt={`Logo de ${supplier.businessName}`}
                width={120}
                height={120}
                className="object-cover aspect-square rounded-lg border-2"
              />
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
                    onChange={onImageChange}
                  />
                </>
              )}
            </div>
          </div>

          {/* Columnas de Campos de información */}
          <div className="space-y-6 lg:col-span-2 lg:pl-8 lg:pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nombre del negocio */}
              <div className="space-y-2">
                <Label
                  htmlFor="businessName"
                  className="flex items-center gap-2"
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  Nombre del Negocio
                </Label>
                {isEditing ? (
                  <Input
                    id="businessName"
                    name="businessName"
                    value={editedSupplier?.businessName || ""}
                    onChange={onInputChange}
                  />
                ) : (
                  <p className="text-lg font-semibold">
                    {supplier.businessName}
                  </p>
                )}
              </div>

              {/* Nombre del proveedor */}
              <div className="space-y-2">
                <Label
                  htmlFor="providerName"
                  className="flex items-center gap-2"
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  Nombre del Proveedor
                </Label>
                {isEditing ? (
                  <Input
                    id="providerName"
                    name="providerName"
                    value={editedSupplier?.providerName || ""}
                    onChange={onInputChange}
                  />
                ) : (
                  <p className="font-medium">{supplier.providerName}</p>
                )}
              </div>

              {/* Teléfono */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  Teléfono
                </Label>
                {isEditing ? (
                  <Input
                    id="phone"
                    name="phone"
                    value={editedSupplier?.phone || ""}
                    onChange={onInputChange}
                  />
                ) : (
                  <p className="font-medium">{supplier.phone}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Correo Electrónico
                </Label>
                {isEditing ? (
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={editedSupplier?.email || ""}
                    onChange={onInputChange}
                  />
                ) : (
                  <p className="font-medium">{supplier.email}</p>
                )}
              </div>
            </div>

            {/* Botones de acción en modo edición */}
            {isEditing && (
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={onCancel}
                  className="flex-1 cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button onClick={onSave} className="flex-1 cursor-pointer">
                  Guardar Cambios
                </Button>
                <Button
                  variant="destructive"
                  onClick={onDelete}
                  className="cursor-pointer"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}