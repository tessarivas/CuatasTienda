"use client";

import * as React from "react";
import { DashboardContext } from "../layout";
import { type Product, type Client } from "@/lib/data";
import { ProductsTable } from "./_components/products-table";
import { EditProductModal } from "./_components/edit-product-modal";
import { WithdrawProductModal } from "./_components/withdraw-product-modal";
import { AddProductModal, type NewProductData } from "./_components/add-product-modal";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SelectClientModal } from "./_components/select-client-modal"; // ¡Importar el nuevo modal!

export default function Page() {
  const { products, setProducts, clients, suppliers } =
  React.useContext(DashboardContext);

  // ... (estados de filtros sin cambios)
  const [searchTerm, setSearchTerm] = React.useState("");
  const [supplierFilter, setSupplierFilter] = React.useState<string | number>("todos");
  const [statusFilter, setStatusFilter] = React.useState("todos");

  // Estados para los modales
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = React.useState(false);
  const [isSelectClientModalOpen, setIsSelectClientModalOpen] = React.useState(false); // <-- NUEVO ESTADO
  const [productToAssign, setProductToAssign] = React.useState<Product | null>(null); // <-- NUEVO ESTADO


  // ... (handleOpenEditModal, handleOpenWithdrawModal sin cambios)
  const handleOpenEditModal = (product: Product) => {
    setProductToAssign(product);
    setIsEditModalOpen(true);
  };

  const handleOpenWithdrawModal = (product: Product) => {
    setProductToAssign(product);
    setIsWithdrawModalOpen(true);
  };

  const handleCloseModals = () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setIsWithdrawModalOpen(false);
    setIsSelectClientModalOpen(false); // <-- CERRAR NUEVO MODAL
    setProductToAssign(null);
  };

  const handleAddSupplier = async (newSupplier) => {
  try {
    const res = await fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSupplier),
    });

    if (!res.ok) throw new Error("Error creando proveedor");

    const createdSupplier = await res.json();

    // 🔥 sincroniza estado global
    setSuppliers((prev) => [createdSupplier, ...prev]);
  } catch (error) {
    console.error(error);
    alert("No se pudo crear el proveedor");
  }
};

  // ... (handleSaveProduct, handleWithdrawProduct, handleAddProduct sin cambios)
  const handleSaveProduct = (updatedProduct: Product) => {
    setProducts(
      products.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
    );
  };
  const handleWithdrawProduct = (productId: string, reason: string, user: string) => {
    setProducts(products.filter((p) => p.id !== productId));
  };
  const handleAddProduct = async (newProductData: NewProductData) => {
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: newProductData.title,
          price: newProductData.price,
          quantity: newProductData.quantity,
          picture: newProductData.photoUrl,
          supplierId: Number(newProductData.supplierId),
          status: "Disponible",
          type: "PRODUCT", // IMPORTANTE (enum Prisma)
        }),
      });

      if (!res.ok) throw new Error("Error creando producto");

      const createdProduct = await res.json();

      // 🔥 sincronizar estado global
      setProducts((prev) => [createdProduct, ...prev]);
    } catch (error) {
      console.error(error);
      alert("No se pudo crear el producto");
    }
  };

  // FUNCIÓN ACTUALIZADA: Ahora abre el modal de selección de cliente
  const handleOpenAssignModal = (product: Product) => {
    if (clients.length > 0) {
      setProductToAssign(product); // Guardamos el producto que se va a apartar
      setIsSelectClientModalOpen(true); // Abrimos el modal de clientes
    } else {
      alert("No hay clientes registrados para poder apartar un producto.");
    }
  };

  // NUEVA FUNCIÓN: Se ejecuta cuando se selecciona un cliente en el modal
  const handleClientSelectedForAssignment = (client: Client) => {
    if (!productToAssign) return;

    setProducts(
      products.map((p) =>
        p.id === productToAssign.id
          ? { ...p, status: "Apartado", clientId: client.id }
          : p
      )
    );
    // Limpiamos el estado después de la operación
    setProductToAssign(null);
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSupplier = supplierFilter === "todos" || product.supplierId === Number(supplierFilter);
    const matchesStatus = statusFilter === "todos" || product.status === statusFilter;
    return matchesSearch && matchesSupplier && matchesStatus;
  });

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        {/* ... (Barra de filtros y botón de agregar sin cambios) ... */}
        <div className="flex items-center gap-4">
          <Input
            placeholder="Buscar por título..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger className="w-45 cursor-pointer">
              <SelectValue placeholder="Filtrar por proveedor" />
            </SelectTrigger>
            <SelectContent className="cursor-pointer">
              <SelectItem value="todos">Todos los proveedores</SelectItem>
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={String(supplier.id)}>
                  {supplier.businessName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-45 cursor-pointer">
              <SelectValue placeholder="Filtrar por estatus" />
            </SelectTrigger>
            <SelectContent className="cursor-pointer">
              <SelectItem value="todos">Todos los estatus</SelectItem>
              <SelectItem value="Disponible">Disponible</SelectItem>
              <SelectItem value="Apartado">Apartado</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto">
            <Button className="cursor-pointer" onClick={() => setIsAddModalOpen(true)}>
              Agregar Producto
            </Button>
          </div>
        </div>

        <ProductsTable
          products={filteredProducts}
          suppliers={suppliers}
          onEdit={handleOpenEditModal}
          onWithdraw={handleOpenWithdrawModal}
          onAssign={handleOpenAssignModal}
        />
      </div>

      {/* Renderizar el nuevo modal */}
      <SelectClientModal
        isOpen={isSelectClientModalOpen}
        onClose={handleCloseModals}
        onSelectClient={handleClientSelectedForAssignment}
        clients={clients}
      />

      {/* ... (otros modales existentes) ... */}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={handleCloseModals}
        onAdd={handleAddProduct}
        suppliers={suppliers}
      />
      <EditProductModal
        isOpen={isEditModalOpen}
        onClose={handleCloseModals}
        onSave={handleSaveProduct}
        product={productToAssign}
      />
      <WithdrawProductModal
        isOpen={isWithdrawModalOpen}
        onClose={handleCloseModals}
        onConfirm={handleWithdrawProduct}
        product={productToAssign}
      />
    </>
  );
}
