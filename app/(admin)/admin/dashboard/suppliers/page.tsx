// app/(admin)/admin/dashboard/suppliers/page.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SupplierCard } from "./_components/supplier-card";
import { AddSupplierModal } from "./_components/add-supplier-modal";
import { DashboardContext } from "../layout";
import { Button } from "@/components/ui/button";
import { initialSuppliers, type Supplier } from "@/lib/data";
import { Input } from "@/components/ui/input";

export default function Page() {
  const router = useRouter();
  const [suppliers, setSuppliers] = React.useState(initialSuppliers);
  const { isAddSupplierModalOpen, setIsAddSupplierModalOpen } =
    React.useContext(DashboardContext);
  const [searchTerm, setSearchTerm] = React.useState("");

  // Navegar a la página de detalles en lugar de abrir modal
  const handleCardClick = (supplier: Supplier) => {
    router.push(`/admin/dashboard/suppliers/${supplier.id}`);
  };

  const handleAddSupplier = (
    newSupplierData: Omit<Supplier, "id" | "logo">
  ) => {
    const newSupplier: Supplier = {
      ...newSupplierData,
      id: (suppliers.length + 1).toString(),
      logo: "/suppliers/default-logo.png",
    };
    setSuppliers((prevSuppliers) => [...prevSuppliers, newSupplier]);
  };

  const filteredSuppliers = suppliers.filter(
    (supplier) =>
      supplier.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.providerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-4">
          <Input
            placeholder="Buscar proveedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <div className="ml-auto">
            <Button
              onClick={() => setIsAddSupplierModalOpen(true)}
              className="cursor-pointer"
            >
              Agregar Proveedor
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
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