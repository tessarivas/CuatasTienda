"use client";

import * as React from "react";
import Image from "next/image";
import { type Supplier } from "@/lib/data";
import { CardActionButton } from "./card-action-button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, User, Pencil } from "lucide-react";

// Tarjeta de sólo lectura. La edición vive en EditSupplierModal — antes los
// campos se editaban aquí mismo con un modo `isEditing`.
interface SupplierDetailsFormProps {
  supplier: Supplier;
  onEdit: () => void;
}

export function SupplierDetailsForm({
  supplier,
  onEdit,
}: SupplierDetailsFormProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Detalles del Proveedor</CardTitle>
        <CardActionButton onClick={onEdit}>
          <Pencil />
          Editar
        </CardActionButton>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-8">
          {/* Columna del Logo */}
          <div className="flex flex-col items-center gap-4 py-6 lg:border-r lg:pr-8">
            <div className="w-30 h-30 relative rounded-lg border-2 overflow-hidden bg-muted flex items-center justify-center">
              {supplier.logo ? (
                <Image
                  src={supplier.logo}
                  alt={`Logo de ${supplier.businessName}`}
                  fill
                  className="object-cover"
                />
              ) : (
                <User className="h-12 w-12 text-muted-foreground opacity-50" />
              )}
            </div>
          </div>

          {/* Columnas de Campos de información */}
          <div className="space-y-6 lg:col-span-2 lg:pl-8 lg:pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nombre del negocio */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Nombre del Negocio
                </Label>
                <p className="text-lg font-semibold">{supplier.businessName}</p>
              </div>

              {/* Nombre del proveedor */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Nombre del Proveedor
                </Label>
                <p className="font-medium">{supplier.name}</p>
              </div>

              {/* Teléfono */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  Teléfono
                </Label>
                <p className="font-medium">
                  {supplier.cellphone || "Sin teléfono"}
                </p>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Correo Electrónico
                </Label>
                <p className="font-medium">{supplier.email || "Sin email"}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
