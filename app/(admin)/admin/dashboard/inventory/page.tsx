"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { DashboardContext } from "../layout";
import { type Product, type Client } from "@/lib/data";
import { useTodayLabel } from "@/hooks/use-today-label";
import { ProductsTable } from "./_components/products-table";
import { ProductDetailsModal } from "../suppliers/_components/product-details-modal";
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
import { Loader2, PackagePlus, Wrench } from "lucide-react";
import { SelectClientModal } from "./_components/select-client-modal"; // ¡Importar el nuevo modal!
import {
  normalizeProduct,
  normalizeProducts,
  type ApiProduct,
} from "@/lib/products/normalize";
import { toast } from "@/lib/toast";

export default function Page() {
  const {
    products,
    setProducts,
    clients,
    suppliers,
    isLoadingProducts,
    isLoadingSuppliers,
  } = React.useContext(DashboardContext);

  // ... (estados de filtros sin cambios)
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] =
    React.useState<"productos" | "servicios">("productos");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [supplierFilter, setSupplierFilter] = React.useState<string>(
    searchParams.get("supplier") ?? "todos"
  );
  const [statusFilter, setStatusFilter] = React.useState("todos");
  // "reciente" no reordena nada: GET /api/products?include=all ya llega
  // ordenado por createdAt desc desde el backend (y handleAddProduct
  // antepone los nuevos), así que el orden del array ya ES "más reciente
  // primero". El Product normalizado no trae createdAt — no hace falta,
  // basta con respetar (o invertir) el orden en que llegó.
  type SortOrder = "reciente" | "antiguos" | "precio-desc" | "precio-asc";
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("reciente");

  // Estados para los modales
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  // Click en la fila → detalle de sólo lectura (product-details-modal.tsx,
  // el mismo que usa la página de proveedor). Ahí adentro viven Editar,
  // Eliminar producto y los movimientos de stock — ya no hay un modal de
  // edición directa ni un menú de acciones aparte en esta tabla.
  const [isDetailsModalOpen, setIsDetailsModalOpen] = React.useState(false);
  const [isSelectClientModalOpen, setIsSelectClientModalOpen] = React.useState(false); // <-- NUEVO ESTADO
  const [productToAssign, setProductToAssign] = React.useState<Product | null>(null); // <-- NUEVO ESTADO


  const handleOpenDetailsModal = (product: Product) => {
    setProductToAssign(product);
    setIsDetailsModalOpen(true);
  };

  const handleCloseModals = () => {
    setIsAddModalOpen(false);
    setIsDetailsModalOpen(false);
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
    toast.error("No se pudo crear el proveedor");
  }
};

  // ProductDetailsModal (el aprobado, compartido con la página de proveedor)
  // no devuelve el producto actualizado — avisa con onChanged y el padre
  // vuelve a pedir la lista completa.
  const reloadProducts = async () => {
    try {
      const res = await fetch("/api/products?include=all");
      if (!res.ok) return;
      const data: ApiProduct[] = await res.json();
      setProducts(normalizeProducts(data));
    } catch (error) {
      console.error("Error recargando productos", error);
    }
  };

  const handleAddProduct = (product: Product) => {
    const normalized = normalizeProduct(product as unknown as ApiProduct);
    setProducts((prev) => [normalized, ...prev]);
  };

  // Mismo patrón que supplier-products-list.tsx para alimentar ProductDetailsModal.
  const getSupplierName = (product: Product) =>
    suppliers.find((s) => String(s.id) === product.supplierId)
      ?.businessName ?? "Desconocido";

  const getClientName = (product: Product) => {
    if (!product.clientId) return undefined;
    const client = clients.find((c) => c.id === product.clientId);
    return client?.name;
  };

  // FUNCIÓN ACTUALIZADA: Ahora abre el modal de selección de cliente
  const handleOpenAssignModal = (product: Product) => {
    if (clients.length > 0) {
      setProductToAssign(product); // Guardamos el producto que se va a apartar
      setIsSelectClientModalOpen(true); // Abrimos el modal de clientes
    } else {
      toast.warning("No hay clientes registrados para poder apartar un producto.");
    }
  };

  // Cuando seleccionan un cliente en el modal, persistimos el apartado vía
  // la API del cliente. En éxito, subimos el reservedCount local para que el
  // UI refleje la reserva sin tocar product.status.
  const handleClientSelectedForAssignment = async (client: Client) => {
    if (!productToAssign) return false;
    const product = productToAssign;

    try {
      const res = await fetch(`/api/clients/${client.id}/layaway/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: Number(product.id) }),
      });
      if (!res.ok) {
        const { error: message } = await res.json();
        toast.error(message ?? "No se pudo apartar el producto");
        return false;
      }
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id
            ? { ...p, reservedCount: (p.reservedCount ?? 0) + 1 }
            : p
        )
      );
      // El modal se cierra hasta que el apartado quedó guardado.
      setProductToAssign(null);
      handleCloseModals();
      toast.success(`Apartado para ${client.name}`);
      return true;
    } catch {
      toast.error("No se pudo apartar el producto");
      return false;
    }
  };

  // Separa productos vs servicios antes del resto de filtros. Cada pestaña
  // mostrará su propio set; los filtros de búsqueda/proveedor/estatus se
  // comparten entre ambas.
  const isService = (p: Product) => p.type === "SERVICE";
  const productItems = products.filter((p) => !isService(p));
  const serviceItems = products.filter(isService);

  // `withStatus` = false en Servicios: no tienen estatus, y el filtro de
  // estatus de Productos (que ahí no se ve) no debe vaciarlos. La selección
  // se conserva al regresar a Productos.
  const applyFilters = (list: Product[], withStatus: boolean) =>
    list.filter((product) => {
      const matchesSearch = product.title
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesSupplier =
        supplierFilter === "todos" ||
        String(product.supplierId) === supplierFilter;
      const matchesStatus = (() => {
        if (!withStatus || statusFilter === "todos") return true;
        if (statusFilter === "apartados") return (product.reservedCount ?? 0) > 0;
        // "Disponible" = queda al menos una unidad libre. Product.status no
        // refleja reservas, así que uno con todo apartado seguiría diciendo
        // "Disponible" aunque no se pueda vender; misma regla que el badge
        // de la tabla.
        if (statusFilter === "Disponible") {
          return (
            product.status === "Disponible" &&
            product.quantity - (product.reservedCount ?? 0) > 0
          );
        }
        return product.status === statusFilter;
      })();
      return matchesSearch && matchesSupplier && matchesStatus;
    });

  const applySort = (list: Product[]) => {
    const sorted = [...list];
    switch (sortOrder) {
      case "reciente":
        return sorted; // orden de llegada = más reciente primero
      case "antiguos":
        return sorted.reverse();
      case "precio-desc":
        return sorted.sort((a, b) => b.price - a.price);
      case "precio-asc":
        return sorted.sort((a, b) => a.price - b.price);
    }
  };

  const filteredProducts = applySort(applyFilters(productItems, true));
  const filteredServices = applySort(applyFilters(serviceItems, false));

  const visibleItems =
    activeTab === "productos" ? filteredProducts : filteredServices;

  // DD/MM/YY calculado sólo en el navegador (ver hooks/use-today-label.ts).
  const formattedDate = useTodayLabel();

  // Mismo loader que suppliers/[id]: products y suppliers vienen de
  // DashboardContext (fetch en layout.tsx). Esta tabla necesita ambos —
  // productos para las filas, proveedores para nombres/logo/filtro.
  if (isLoadingProducts || isLoadingSuppliers) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 h-full">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando inventario...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        {/* Mismo tratamiento que "Lista de Proveedores": texto propio, no el
            mismo literal que el nombre de la sección en el sidebar. */}
        <h1 className="text-2xl font-bold">
          Mi Inventario Hoy {formattedDate}
        </h1>

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

        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <Input
            placeholder={
              activeTab === "productos"
                ? "Buscar por título..."
                : "Buscar servicio..."
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            // En escritorio toma sólo lo que sobra (flex-1, mínimo 10rem) para
            // que filtros y botón quepan en un renglón; en celular, ancho
            // completo arriba de los filtros.
            className="w-full lg:w-auto lg:min-w-40 lg:max-w-sm lg:flex-1"
          />
          <Select
            value={sortOrder}
            onValueChange={(v) => setSortOrder(v as SortOrder)}
          >
            <SelectTrigger className="w-full cursor-pointer sm:w-44">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent className="cursor-pointer">
              <SelectItem value="reciente">Recientes primero</SelectItem>
              <SelectItem value="antiguos">Antiguos primero</SelectItem>
              <SelectItem value="precio-desc">
                Precio: mayor a menor
              </SelectItem>
              <SelectItem value="precio-asc">
                Precio: menor a mayor
              </SelectItem>
            </SelectContent>
          </Select>
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            {/* w-45 recortaba "Todos los proveedores" a la mitad; w-52 ya
                lo muestra completo. truncate
                queda además como red de seguridad por si se elige un
                proveedor con nombre largo. */}
            <SelectTrigger className="w-full cursor-pointer sm:w-52">
              <SelectValue
                placeholder="Filtrar por proveedor"
                className="truncate"
              />
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
              <SelectTrigger className="w-full cursor-pointer sm:w-44">
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
          <div className="w-full sm:ml-auto sm:w-auto">
            <Button className="w-full cursor-pointer sm:w-auto" onClick={() => setIsAddModalOpen(true)}>
              {activeTab === "productos" ? (
                <>
                  <PackagePlus />
                  {/* Entre lg y 1380px sólo "Agregar" para que quepa en el
                      renglón de filtros; el icono dice qué se agrega. */}
                  <span className="lg:hidden min-[1380px]:inline">Agregar Producto</span>
                  <span className="hidden lg:inline min-[1380px]:hidden">Agregar</span>
                </>
              ) : (
                <>
                  <Wrench />
                  <span className="lg:hidden min-[1380px]:inline">Agregar Servicio</span>
                  <span className="hidden lg:inline min-[1380px]:hidden">Agregar</span>
                </>
              )}
            </Button>
          </div>
        </div>

        <ProductsTable
          products={visibleItems}
          suppliers={suppliers}
          mode={activeTab === "servicios" ? "service" : "product"}
          onAssign={handleOpenAssignModal}
          onRowClick={handleOpenDetailsModal}
        />
      </div>

      {/* Renderizar el nuevo modal */}
      <SelectClientModal
        isOpen={isSelectClientModalOpen}
        onClose={handleCloseModals}
        onSelectClient={handleClientSelectedForAssignment}
        clients={clients}
        productTitle={productToAssign?.title}
      />

      {/* ... (otros modales existentes) ... */}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={handleCloseModals}
        onAdd={handleAddProduct}
        suppliers={suppliers}
        type={activeTab === "servicios" ? "SERVICE" : "PRODUCT"}
      />
      {/* Click en cualquier parte de la fila → el mismo modal de detalle que
          usa la página de proveedor, abierto en modo lectura. Editar,
          Eliminar producto y los movimientos de stock viven dentro de él. */}
      <ProductDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={handleCloseModals}
        onChanged={reloadProducts}
        product={productToAssign}
        supplierName={
          productToAssign ? getSupplierName(productToAssign) : undefined
        }
        clientName={
          productToAssign ? getClientName(productToAssign) : undefined
        }
      />
    </>
  );
}
