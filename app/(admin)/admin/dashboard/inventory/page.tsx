"use client";

import * as React from "react";
import { initialProducts, initialSuppliers, type Product } from "@/lib/data";
import { ProductsTable } from "./_components/products-table";
import { EditProductModal } from "./_components/edit-product-modal";
import { WithdrawProductModal } from "./_components/withdraw-product-modal";
import { AddProductModal, type NewProductData } from "./_components/add-product-modal"; // 1. Importar el nuevo modal
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function Page() {
  const [products, setProducts] = React.useState(initialProducts);
  const [suppliers] = React.useState(initialSuppliers);

  // Estados para los filtros
  const [searchTerm, setSearchTerm] = React.useState("");
  const [supplierFilter, setSupplierFilter] = React.useState("todos");
  const [statusFilter, setStatusFilter] = React.useState("todos");

  // Estados para los modales
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false); // 2. Estado para el modal de agregar
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(
    null
  );

  const handleOpenEditModal = (product: Product) => {
    setSelectedProduct(product);
    setIsEditModalOpen(true);
  };

  const handleOpenWithdrawModal = (product: Product) => {
    setSelectedProduct(product);
    setIsWithdrawModalOpen(true);
  };

  const handleCloseModals = () => {
    setIsAddModalOpen(false); // Asegurarse de cerrar todos los modales
    setIsEditModalOpen(false);
    setIsWithdrawModalOpen(false);
    setSelectedProduct(null);
  };

  const handleSaveProduct = (updatedProduct: Product) => {
    setProducts(
      products.map((p) =>
        p.id === updatedProduct.id ? updatedProduct : p
      )
    );
    console.log("Producto guardado:", updatedProduct);
  };

  const handleWithdrawProduct = (
    productId: string,
    reason: string,
    user: string
  ) => {
    setProducts(products.filter((p) => p.id !== productId));
    console.log(
      `Producto retirado: ${productId}. Motivo: ${reason}. Autorizado por: ${user}`
    );
  };

  // 3. Función para agregar el nuevo producto
  const handleAddProduct = (newProductData: NewProductData) => {
    const newProduct: Product = {
      ...newProductData,
      id: `prod-${Date.now()}`, // ID único simple basado en el tiempo
      status: "Disponible", // Estado por defecto
    };
    setProducts((prevProducts) => [newProduct, ...prevProducts]);
    console.log("Nuevo producto agregado:", newProduct);
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesSupplier =
      supplierFilter === "todos" || product.supplierId === supplierFilter;
    const matchesStatus =
      statusFilter === "todos" || product.status === statusFilter;
    return matchesSearch && matchesSupplier && matchesStatus;
  });

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        {/* Barra de Filtros y Acciones */}
        <div className="flex items-center gap-4">
          {/* ... (Inputs de filtros existentes) ... */}
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
                <SelectItem key={supplier.id} value={supplier.id}>
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
            {/* 4. Conectar el botón para abrir el modal */}
            <Button className="cursor-pointer" onClick={() => setIsAddModalOpen(true)}>
              Agregar Producto
            </Button>
          </div>
        </div>

        {/* Tabla de Productos */}
        <ProductsTable
          products={filteredProducts}
          suppliers={suppliers}
          onEdit={handleOpenEditModal}
          onWithdraw={handleOpenWithdrawModal}
        />
      </div>

      {/* Modales */}
      {/* 5. Renderizar el nuevo modal */}
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
        product={selectedProduct}
      />
      <WithdrawProductModal
        isOpen={isWithdrawModalOpen}
        onClose={handleCloseModals}
        onConfirm={handleWithdrawProduct}
        product={selectedProduct}
      />
    </>
  );
}
