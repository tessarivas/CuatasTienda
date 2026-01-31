"use client";

import * as React from "react";
import { ArrowLeft, UserRoundPlus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { SupplierCard } from "./_components/supplier-card";
import { AddSupplierModal } from "./_components/add-supplier-modal";
import { DashboardContext } from "../layout";
import { Button } from "@/components/ui/button";
import { type Supplier } from "@/lib/data";
import { Input } from "@/components/ui/input";

export default function Page() {
  const router = useRouter();
  const {
    suppliers,
    reloadSuppliers,
    isAddSupplierModalOpen,
    setIsAddSupplierModalOpen,
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
      <div className="p-4 space-y-4">
        {/* Sección del Encabezado */}
        <div className="flex flex-col md:flex-row md:items-center md:gap-4">
          <div className="flex items-center gap-2">
            <Button className="cursor-pointer" variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Lista de Proveedores</h1>
          </div>
          {/* Busqueda y Agregar Proveedor */}
          <div className="mt-4 md:mt-0 md:ml-auto flex items-center gap-2">
            <div className="relative grow">
              <Input
                placeholder="Buscar por nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-lg pl-10"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
            <Button onClick={() => setIsAddSupplierModalOpen(true)}>
              <UserRoundPlus className="h-4 w-4" />
              Agregar Proveedor
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {filteredSuppliers.map((supplier) => (
            <SupplierCard
              key={supplier.id}
              supplier={supplier}
              onClick={() => handleCardClick(supplier)}
            />
          ))}
        </div>
      </div>

      <AddSupplierModal
        isOpen={isAddSupplierModalOpen}
        onClose={() => setIsAddSupplierModalOpen(false)}
        onAdd={handleAddSupplier}
      />
    </>
  );
}
