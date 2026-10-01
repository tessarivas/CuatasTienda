"use client";

import * as React from "react";
import { ArrowLeft, Loader2, UserRoundPlus, Search } from "lucide-react";
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
    products,
    reloadSuppliers,
    isAddSupplierModalOpen,
    setIsAddSupplierModalOpen,
    isLoadingSuppliers,
    isLoadingProducts,
  } = React.useContext(DashboardContext);

  const [searchTerm, setSearchTerm] = React.useState("");
  const [salesBySupplier, setSalesBySupplier] = React.useState<
    { supplierId: number; total: string }[] | null
  >(null);

  // Mes en curso en la hora local de quien ve la página (la de la tienda),
  // no la del servidor.
  const monthName = new Date().toLocaleDateString("es-MX", { month: "long" });
  React.useEffect(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/suppliers/sales?from=${from.toISOString()}&to=${to.toISOString()}`
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) setSalesBySupplier(data);
      } catch {
        if (!cancelled) setSalesBySupplier([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const supplierName = (id: string | number) =>
    suppliers.find((s) => String(s.id) === String(id))?.businessName ??
    "Proveedor";

  // Productos en tienda ahora: con unidades y no retirados. Los servicios no
  // cuentan — no son artículos físicos.
  const topByProducts = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      if (p.type === "SERVICE" || p.status === "Retirado" || p.quantity <= 0)
        continue;
      counts.set(p.supplierId, (counts.get(p.supplierId) ?? 0) + 1);
    }
    let best: { supplierId: string; count: number } | null = null;
    for (const [supplierId, count] of counts) {
      if (!best || count > best.count) best = { supplierId, count };
    }
    return best;
  }, [products]);

  const topBySales = React.useMemo(() => {
    if (!salesBySupplier || salesBySupplier.length === 0) return null;
    return salesBySupplier.reduce((best, s) =>
      Number(s.total) > Number(best.total) ? s : best
    );
  }, [salesBySupplier]);

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

  // Mismo loader que suppliers/[id]: suppliers viene de DashboardContext
  // (fetch en layout.tsx), no de un fetch propio de esta página, por eso el
  // gate se lee de ahí en vez de un estado local.
  if (isLoadingSuppliers) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 h-full">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando proveedores...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 space-y-4">
        {/* Sección del Encabezado */}
        <div className="flex flex-col md:flex-row md:items-center md:gap-4">
          <div className="flex items-center gap-2">
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
            <Button onClick={() => setIsAddSupplierModalOpen(true)} className="cursor-pointer">
              <UserRoundPlus className="h-4 w-4" />
              Agregar Proveedor
            </Button>
          </div>
        </div>

        {/* Highlights: mismo formato que la página de Clientes. */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl p-5 bg-my-yellow-light text-my-yellow-dark">
            <p className="text-sm font-medium mb-1">Total de Proveedores</p>
            <p className="text-3xl font-bold">{suppliers.length}</p>
          </div>

          <div className="min-w-0 rounded-xl p-5 bg-my-blue-light text-my-blue-dark">
            <p className="text-sm font-medium mb-1">
              Proveedor con más artículos
            </p>
            {isLoadingProducts ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : topByProducts ? (
              <>
                <p className="truncate text-3xl font-bold">
                  {supplierName(topByProducts.supplierId)}
                </p>
                <p className="text-sm">
                  {topByProducts.count}{" "}
                  {topByProducts.count === 1
                    ? "producto en tienda"
                    : "productos en tienda"}
                </p>
              </>
            ) : (
              <p className="text-3xl font-bold">—</p>
            )}
          </div>

          <div className="min-w-0 rounded-xl p-5 bg-my-green-light text-my-green-dark">
            <p className="text-sm font-medium mb-1">
              Más ventas en {monthName}
            </p>
            {salesBySupplier === null ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : topBySales ? (
              <>
                <p className="truncate text-3xl font-bold">
                  {supplierName(topBySales.supplierId)}
                </p>
                <p className="text-sm">
                  ${Number(topBySales.total).toLocaleString("es-MX", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  vendidos
                </p>
              </>
            ) : (
              <>
                <p className="text-3xl font-bold">—</p>
                <p className="text-sm">Aún no hay ventas este mes</p>
              </>
            )}
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
