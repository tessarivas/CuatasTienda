"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { DashboardContext } from "../layout";
import { type Product, type Client } from "@/lib/data";
import { ProductsTable } from "./_components/products-table";
import { EditProductModal } from "./_components/edit-product-modal";
import { WithdrawProductModal } from "./_components/withdraw-product-modal";
import { AddProductModal } from "./_components/add-product-modal";
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
import { normalizeProduct, type ApiProduct } from "@/lib/products/normalize";

export default function Page() {
  const { products, setProducts, clients, suppliers } =
  React.useContext(DashboardContext);

  // ... (estados de filtros sin cambios)
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] =
    React.useState<"productos" | "servicios">("productos");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [supplierFilter, setSupplierFilter] = React.useState<string>(
    searchParams.get("supplier") ?? "todos"
  );
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
    const normalized = normalizeProduct(
      updatedProduct as unknown as ApiProduct
    );
    setProducts(
      products.map((p) => (p.id === normalized.id ? normalized : p))
    );
  };
  const handleWithdrawProduct = async (productId: string, _reason: string, _user: string) => {
    try {
      const res = await fetch(`/api/products/${productId}`, { method: "DELETE" });
      if (!res.ok) {
        const { error: message } = await res.json();
        alert(message ?? "No se pudo retirar el producto");
        return;
      }
      setProducts(products.filter((p) => p.id !== productId));
    } catch {
      alert("No se pudo retirar el producto");
    }
  };
  const handleAddProduct = (product: Product) => {
    const normalized = normalizeProduct(product as unknown as ApiProduct);
    setProducts((prev) => [normalized, ...prev]);
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

  // Cuando seleccionan un cliente en el modal, persistimos el apartado vía
  // la API del cliente. En éxito, subimos el reservedCount local para que el
  // UI refleje la reserva sin tocar product.status.
  const handleClientSelectedForAssignment = async (client: Client) => {
    if (!productToAssign) return;
    const product = productToAssign;
    setProductToAssign(null);

    try {
      const res = await fetch(`/api/clients/${client.id}/layaway/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: Number(product.id) }),
      });
      if (!res.ok) {
        const { error: message } = await res.json();
        alert(message ?? "No se pudo apartar el producto");
        return;
      }
      setProducts(
        products.map((p) =>
          p.id === product.id
            ? { ...p, reservedCount: (p.reservedCount ?? 0) + 1 }
            : p
        )
      );
    } catch {
      alert("No se pudo apartar el producto");
    }
  };

  // Separa productos vs servicios antes del resto de filtros. Cada pestaña
  // mostrará su propio set; los filtros de búsqueda/proveedor/estatus se
  // comparten entre ambas.
  const isService = (p: Product) => p.type === "SERVICE";
  const productItems = products.filter((p) => !isService(p));
  const serviceItems = products.filter(isService);

  const applyFilters = (list: Product[]) =>
    list.filter((product) => {
      const matchesSearch = product.title
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesSupplier =
        supplierFilter === "todos" ||
        String(product.supplierId) === supplierFilter;
      const matchesStatus = (() => {
        if (statusFilter === "todos") return true;
        if (statusFilter === "apartados") return (product.reservedCount ?? 0) > 0;
        return product.status === statusFilter;
      })();
      return matchesSearch && matchesSupplier && matchesStatus;
    });

  const filteredProducts = applyFilters(productItems);
  const filteredServices = applyFilters(serviceItems);

  const visibleItems =
    activeTab === "productos" ? filteredProducts : filteredServices;

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        {/* Pestañas Productos / Servicios */}
        <div className="flex border-b">
          <button
            type="button"
            onClick={() => setActiveTab("productos")}
            className={`px-4 py-2 -mb-px border-b-2 text-sm font-medium cursor-pointer transition-colors ${
              activeTab === "productos"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Productos ({productItems.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("servicios")}
            className={`px-4 py-2 -mb-px border-b-2 text-sm font-medium cursor-pointer transition-colors ${
              activeTab === "servicios"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Servicios ({serviceItems.length})
          </button>
        </div>

        <div className="flex items-center gap-4">
          <Input
            placeholder={
              activeTab === "productos"
                ? "Buscar por título..."
                : "Buscar servicio..."
            }
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
          {activeTab === "productos" && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-45 cursor-pointer">
                <SelectValue placeholder="Filtrar por estatus" />
              </SelectTrigger>
              <SelectContent className="cursor-pointer">
                <SelectItem value="todos">Todos los estatus</SelectItem>
                <SelectItem value="Disponible">Disponible</SelectItem>
                <SelectItem value="apartados">Con apartados</SelectItem>
                <SelectItem value="Vendido">Vendido</SelectItem>
              </SelectContent>
            </Select>
          )}
          <div className="ml-auto">
            <Button className="cursor-pointer" onClick={() => setIsAddModalOpen(true)}>
              {activeTab === "productos" ? "Agregar Producto" : "Agregar Servicio"}
            </Button>
          </div>
        </div>

        <ProductsTable
          products={visibleItems}
          suppliers={suppliers}
          mode={activeTab === "servicios" ? "service" : "product"}
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
        type={activeTab === "servicios" ? "SERVICE" : "PRODUCT"}
      />
      <EditProductModal
        isOpen={isEditModalOpen}
        onClose={handleCloseModals}
        onSave={handleSaveProduct}
        product={productToAssign}
        suppliers={suppliers}
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
