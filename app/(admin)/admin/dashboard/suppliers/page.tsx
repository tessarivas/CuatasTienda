"use client";

import * as React from "react";
import { UserRoundPlus, Search, Package } from "lucide-react";
import { useRouter } from "next/navigation";
import { SupplierCard } from "./_components/supplier-card";
import { AddSupplierModal } from "./_components/add-supplier-modal";
import { DashboardContext } from "../layout";
import { Button } from "@/components/ui/button";
import { type Supplier } from "@/lib/data";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export default function Page() {
  const router = useRouter();
  const {
    suppliers,
    reloadSuppliers,
    isAddSupplierModalOpen,
    setIsAddSupplierModalOpen,
    isLoadingData,
  } = React.useContext(DashboardContext);

  const [searchTerm, setSearchTerm] = React.useState("");

  const handleCardClick = (supplier: Supplier) => {
    router.push(`/admin/dashboard/suppliers/${supplier.id}`);
  };

  const handleAddSupplier = async (_supplier: Supplier) => {
    await reloadSuppliers();
  };

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <>
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        {/* Barra de Búsqueda y Acciones */}
        <div className="flex flex-col justify-between sm:flex-row items-stretch sm:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            className="cursor-pointer"
            onClick={() => setIsAddSupplierModalOpen(true)}
          >
            <UserRoundPlus className="h-4 w-4" />
            Agregar Proveedor
          </Button>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="relative overflow-hidden rounded-xl p-5 bg-my-yellow-light">
            <p className="text-sm font-medium text-my-yellow-dark mb-1">
              Total de Proveedores
            </p>
            <p className="text-3xl font-bold text-my-yellow-dark">
              {suppliers.length}
            </p>
          </div>
          <div className="relative overflow-hidden rounded-xl p-5 bg-my-blue-light">
            <p className="text-sm font-medium text-my-blue-dark mb-1">
              Con Productos Activos
            </p>
            <p className="text-3xl font-bold text-my-blue-dark">
              {suppliers.length}
            </p>
          </div>
          <div className="relative overflow-hidden rounded-xl p-5 bg-my-red-light">
            <p className="text-sm font-medium text-my-red-dark mb-1">
              Resultados de Búsqueda
            </p>
            <p className="text-3xl font-bold text-my-red-dark">
              {filteredSuppliers.length}
            </p>
          </div>
        </div>

        {/* Grid de Proveedores */}
        {isLoadingData ? (
          <div className="flex flex-1 items-center justify-center py-16">
            <div className="flex flex-col items-center gap-2">
              <Spinner className="size-8 text-primary" />
              <p className="text-sm text-muted-foreground">Cargando proveedores...</p>
            </div>
          </div>
        ) : filteredSuppliers.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredSuppliers.map((supplier) => (
              <SupplierCard
                key={supplier.id}
                supplier={supplier}
                onClick={() => handleCardClick(supplier)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="p-6 bg-muted rounded-full mb-4">
              <Package className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {searchTerm
                ? "No se encontraron proveedores"
                : "No hay proveedores registrados"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
              {searchTerm
                ? "Intenta con otro término de búsqueda"
                : "Comienza agregando tu primer proveedor para gestionar el inventario"}
            </p>
            {!searchTerm && (
              <Button
                variant="outline"
                className="cursor-pointer"
                onClick={() => setIsAddSupplierModalOpen(true)}
              >
                <UserRoundPlus className="mr-2 h-4 w-4" />
                Agregar Primer Proveedor
              </Button>
            )}
          </div>
        )}
      </div>

      <AddSupplierModal
        isOpen={isAddSupplierModalOpen}
        onClose={() => setIsAddSupplierModalOpen(false)}
        onAdd={handleAddSupplier}
      />
    </>
  );
}
