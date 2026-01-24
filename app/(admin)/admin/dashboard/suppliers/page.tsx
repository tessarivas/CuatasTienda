"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SupplierCard } from "./_components/supplier-card";
import { AddSupplierModal } from "./_components/add-supplier-modal";
import { DashboardContext } from "../layout";
import { Button } from "@/components/ui/button";
import { type Supplier } from "@/lib/data";
import { Input } from "@/components/ui/input";

export default function Page() {
  const router = useRouter();
  const { suppliers, reloadSuppliers, isAddSupplierModalOpen, setIsAddSupplierModalOpen } =
    React.useContext(DashboardContext);

  const [searchTerm, setSearchTerm] = React.useState("");

  const handleCardClick = (supplier: Supplier) => {
    router.push(`/admin/dashboard/suppliers/${supplier.id}`);
  };

  const handleAddSupplier = async (form: {
    name: string;
    businessName?: string;
    cellphone?: string;
    email?: string;
    image?: File;
  }) => {
    const formData = new FormData();
    formData.append("name", form.name);
    if (form.businessName) formData.append("businessName", form.businessName);
    if (form.cellphone) formData.append("cellphone", form.cellphone);
    if (form.email) formData.append("email", form.email);
    if (form.image) formData.append("image", form.image);

    const res = await fetch("/api/suppliers", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      alert("Error creando proveedor");
      return;
    }

    await reloadSuppliers();
    setIsAddSupplierModalOpen(false);
  };

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-4">
          <Input
            placeholder="Buscar proveedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <div className="ml-auto">
            <Button onClick={() => setIsAddSupplierModalOpen(true)}>
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
