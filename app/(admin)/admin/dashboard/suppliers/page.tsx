"use client";

import * as React from "react";
import { SupplierCard, type Supplier } from "./_components/supplier-card";
import { SupplierDetailsModal } from "./_components/supplier-details-modal";
import { AddSupplierModal } from "./_components/add-supplier-modal"; // 1. Importar el nuevo modal
import { DashboardContext } from "../layout"; // 2. Importar el contexto renombrado

const initialSuppliers: Supplier[] = [
  {
    id: "1",
    providerName: "Maribel Barrón",
    businessName: "Básica Boutique",
    logo: "/suppliers/BASICA-BOUTIQUE-LOGO.jpg",
    phone: "123-456-7890",
    email: "maribel.barron@basica.com",
  },
  {
    id: "2",
    providerName: "Alejandra Gómez",
    businessName: "CIIA",
    logo: "/suppliers/CIIA-LOGO.jpg",
    phone: "098-765-4321",
    email: "alejandra.gomez@ciia.com",
  },
  {
    id: "3",
    providerName: "Elizabeth",
    businessName: "Eli´s Home",
    logo: "/suppliers/ELIS-HOME-LOGO.jpg",
    phone: "555-555-5555",
    email: "elizabeth@elishome.com",
  },
];

export default function Page() {
  const [suppliers, setSuppliers] = React.useState(initialSuppliers);
  const [selectedSupplier, setSelectedSupplier] = React.useState<Supplier | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  // 3. Consumir el estado del modal de agregar desde el contexto
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

  // 4. Crear la función para añadir un nuevo proveedor
  const handleAddSupplier = (newSupplierData: Omit<Supplier, "id" | "logo">) => {
    const newSupplier: Supplier = {
      ...newSupplierData,
      id: (suppliers.length + 1).toString(), // O usar una librería como `uuid` para IDs únicos
      logo: "/suppliers/default-logo.png", // Un logo por defecto
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

      {/* 5. Renderizar el nuevo modal */}
      <AddSupplierModal
        isOpen={isAddSupplierModalOpen}
        onClose={() => setIsAddSupplierModalOpen(false)}
        onAdd={handleAddSupplier}
      />
    </>
  );
}
