// app/(admin)/admin/dashboard/pos/_components/product-grid.tsx
"use client";

import * as React from "react";
import { DashboardContext } from "../../layout";
import { type Product } from "@/lib/data";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Search, Package, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

import { type ActivePromotion, promoUnitDiscount } from "@/lib/promotions";
interface ProductGridProps {
  products: Product[];
  onAddToCart: (productId: string) => void;
  // Promoción vigente para un producto (por su proveedor), o null.
  promoFor?: (product: Product) => ActivePromotion | null;
}

type SortOrder = "reciente" | "antiguos" | "precio-desc" | "precio-asc";
type TypeFilter = "todos" | "productos" | "servicios";

// Con esta cantidad o menos de unidades libres, el contador se pone en rojo.
const LOW_STOCK = 5;

export function ProductGrid({ products, onAddToCart, promoFor }: ProductGridProps) {
  const { suppliers } = React.useContext(DashboardContext);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("reciente");
  const [supplierFilter, setSupplierFilter] = React.useState<string>("todos");
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>("todos");

  // Unidades libres: total menos las apartadas en Layaways activos.
  const availableOf = (p: Product) => p.quantity - (p.reservedCount ?? 0);

  // Mismos filtros que inventario (búsqueda, orden, proveedor). En vez de
  // estatus va el tipo: aquí sólo se muestra lo que se puede vender, así que
  // "Vendido" o "Con apartados" no aplican; Productos/Servicios equivale a
  // las pestañas de inventario.
  const visibleProducts = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = products.filter((product) => {
      const matchesSearch =
        product.title.toLowerCase().includes(term) ||
        (product.barcode?.toLowerCase().includes(term) ?? false);
      const matchesSupplier =
        supplierFilter === "todos" ||
        String(product.supplierId) === supplierFilter;
      const matchesType =
        typeFilter === "todos" ||
        (typeFilter === "servicios"
          ? product.type === "SERVICE"
          : product.type !== "SERVICE");
      // Los servicios no manejan stock: siempre están disponibles mientras
      // su estatus sea "Disponible". Los productos exigen unidades libres.
      const isAvailable =
        product.status === "Disponible" &&
        (product.type === "SERVICE" || availableOf(product) > 0);
      return matchesSearch && matchesSupplier && matchesType && isAvailable;
    });

    switch (sortOrder) {
      case "reciente":
        return filtered; // orden de llegada = más reciente primero
      case "antiguos":
        return [...filtered].reverse();
      case "precio-desc":
        return [...filtered].sort((a, b) => b.price - a.price);
      case "precio-asc":
        return [...filtered].sort((a, b) => a.price - b.price);
    }
  }, [products, searchTerm, supplierFilter, typeFilter, sortOrder]);

  return (
    <div className="flex flex-col h-full">
      {/* Barra de búsqueda y filtros, en una fila como en inventario. */}
      <div className="shrink-0 p-4 border-b bg-background">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={sortOrder}
            onValueChange={(v) => setSortOrder(v as SortOrder)}
          >
            <SelectTrigger className="w-44 cursor-pointer">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="reciente">Recientes primero</SelectItem>
              <SelectItem value="antiguos">Antiguos primero</SelectItem>
              <SelectItem value="precio-desc">Precio: mayor a menor</SelectItem>
              <SelectItem value="precio-asc">Precio: menor a mayor</SelectItem>
            </SelectContent>
          </Select>
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            {/* Se ajusta al texto (w-fit, default del trigger) para que
                "Todos los proveedores" no se corte; max-w para nombres largos. */}
            <SelectTrigger className="max-w-56 cursor-pointer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los proveedores</SelectItem>
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={String(supplier.id)}>
                  {supplier.businessName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v as TypeFilter)}
          >
            <SelectTrigger className="cursor-pointer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Productos y servicios</SelectItem>
              <SelectItem value="productos">Sólo productos</SelectItem>
              <SelectItem value="servicios">Sólo servicios</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid de productos */}
      <div className="flex-1 min-h-0 overflow-auto p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {visibleProducts.map((product) => {
            const isService = product.type === "SERVICE";
            const available = availableOf(product);
            return (
              <Card
                key={product.id}
                onClick={() => onAddToCart(product.id)}
                // gap-3 (no el gap-6 del Card base) y misma estructura para
                // productos y servicios: foto, título de alto fijo, precio.
                className="cursor-pointer gap-3 p-3 transition-shadow hover:shadow-lg"
              >
                <div className="relative aspect-square overflow-hidden rounded-md bg-muted flex items-center justify-center">
                  {product.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.photoUrl}
                      alt={product.title}
                      className="h-full w-full object-cover"
                    />
                  ) : isService ? (
                    <Wrench className="h-10 w-10 text-muted-foreground" />
                  ) : (
                    <Package className="h-10 w-10 text-muted-foreground" />
                  )}

                  {/* Esquina: unidades libres (como el contador de
                      clients/[id]); en servicios, un ícono — no llevan stock. */}
                  <span
                    title={
                      isService
                        ? "Servicio"
                        : `${available} ${available === 1 ? "disponible" : "disponibles"}`
                    }
                    className={cn(
                      "absolute top-2 right-2 flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums",
                      isService
                        ? "bg-background/90 text-muted-foreground shadow-sm"
                        : available <= LOW_STOCK
                          ? "bg-my-red-light text-my-red-dark"
                          : "bg-foreground text-background"
                    )}
                  >
                    {isService ? <Wrench className="h-3.5 w-3.5" /> : available}
                  </span>
                </div>

                <div className="space-y-1">
                  {/* Alto fijo de 2 renglones (leading-5 × 2 = h-10) para que
                      el precio quede alineado en todas las tarjetas aunque el
                      nombre sea corto; si es más largo se corta con "…". */}
                  <h3
                    className="h-10 line-clamp-2 text-sm font-semibold leading-5"
                    title={product.title}
                  >
                    {product.title}
                  </h3>
                  {(() => {
                    const promo = promoFor?.(product);
                    if (!promo) {
                      return <p className="text-lg font-bold">${product.price.toFixed(2)}</p>;
                    }
                    // Promoción: precio rebajado y el normal tachado.
                    const promoPrice = product.price - promoUnitDiscount(product.price, promo);
                    return (
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <p className="text-lg font-bold text-my-green-dark">${promoPrice.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground line-through">
                          ${product.price.toFixed(2)}
                        </p>
                        <span className="rounded bg-my-green-light px-1.5 py-px text-[10px] font-semibold text-my-green-dark">
                          Promo
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Mensaje si no hay productos */}
        {visibleProducts.length === 0 && (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">
              No se encontraron productos disponibles
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
