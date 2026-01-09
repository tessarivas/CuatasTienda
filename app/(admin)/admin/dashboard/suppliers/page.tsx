"use client";

import * as React from "react";
import { SupplierCard } from "./_components/supplier-card";
import { SupplierDetailsModal } from "./_components/supplier-details-modal";
import { AddSupplierModal } from "./_components/add-supplier-modal";
import { DashboardContext } from "../layout";
import { initialSuppliers, type Supplier } from "@/lib/data"; 

export default function Page() {
  const [suppliers, setSuppliers] = React.useState(initialSuppliers);
  const [selectedSupplier, setSelectedSupplier] = React.useState<Supplier | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const { searchTerm, isAddSupplierModalOpen, setIsAddSupplierModalOpen } = React.useContext(DashboardContext); 

  const handleCardClick = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSupplier(null);
  };

  const handleSaveSupplier = (updatedSupplier: Supplier) => {
    setSuppliers((prevSuppliers) =>
      prevSuppliers.map((s) =>
        s.id === updatedSupplier.id ? updatedSupplier : s
      )
    );
    handleCloseModal();
  };

  const handleDeleteSupplier = (supplierId: string) => {
    setSuppliers((prevSuppliers) =>
      prevSuppliers.filter((s) => s.id !== supplierId)
    );
    handleCloseModal();
  };

  const handleAddSupplier = (newSupplierData: Omit<Supplier, "id" | "logo">) => {
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

      <SupplierDetailsModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        supplier={selectedSupplier}
        onSave={handleSaveSupplier}
        onDelete={handleDeleteSupplier}
      />

      <AddSupplierModal
        isOpen={isAddSupplierModalOpen}
        onClose={() => setIsAddSupplierModalOpen(false)}
        onAdd={handleAddSupplier}
      />
    </>
  );
}
