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
import { Badge } from "@/components/ui/badge";
import { Search, Package, Wrench } from "lucide-react";

interface ProductGridProps {
  products: Product[];
  onAddToCart: (productId: string) => void;
}

export function ProductGrid({ products, onAddToCart }: ProductGridProps) {
  const { products: contextProducts } = React.useContext(DashboardContext);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [supplierFilter, setSupplierFilter] = React.useState<string>("all");

  // Obtener lista única de proveedores
  const suppliers = React.useMemo(() => {
    const uniqueSuppliers = new Map();
    contextProducts.forEach((product) => {
      if (!uniqueSuppliers.has(product.supplierId)) {
        uniqueSuppliers.set(product.supplierId, product.supplierId);
      }
    });
    return Array.from(uniqueSuppliers.values());
  }, [contextProducts]);

  // Unidades libres: total menos las apartadas en Layaways activos.
  const availableOf = React.useCallback(
    (p: Product) => p.quantity - (p.reservedCount ?? 0),
    []
  );

  // Filtrar productos
  const filteredProducts = React.useMemo(() => {
    return products.filter((product) => {
      // Filtro de búsqueda (nombre o código de barras)
      const matchesSearch =
        product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.barcode?.includes(searchTerm) ||
        false;

      // Filtro de proveedor
      const matchesSupplier =
        supplierFilter === "all" || product.supplierId === supplierFilter;

      // Los servicios no manejan stock: siempre están disponibles mientras
      // su estatus sea "Disponible". Los productos exigen unidades libres.
      const isAvailable =
        product.status === "Disponible" &&
        (product.type === "SERVICE" || availableOf(product) > 0);

      return matchesSearch && matchesSupplier && isAvailable;
    });
  }, [products, searchTerm, supplierFilter, availableOf]);

  return (
    <div className="flex flex-col h-full">
      {/* Barra de búsqueda y filtros */}
      <div className="p-4 border-b bg-background space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por nombre o código de barras..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={supplierFilter} onValueChange={setSupplierFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por proveedor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los proveedores</SelectItem>
            {suppliers.map((supplierId) => (
              <SelectItem key={supplierId} value={supplierId}>
                Proveedor {supplierId}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid de productos */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <Card
              key={product.id}
              onClick={() => onAddToCart(product.id)}
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 p-4 flex flex-col"
            >
              {/* Imagen del producto (o placeholder si no hay foto) */}
              <div className="aspect-square bg-muted rounded-md mb-3 flex items-center justify-center overflow-hidden">
                {product.photoUrl ? (
                  <img
                    src={product.photoUrl}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                ) : product.type === "SERVICE" ? (
                  <Wrench className="h-10 w-10 text-muted-foreground" />
                ) : (
                  <Package className="h-10 w-10 text-muted-foreground" />
                )}
              </div>

              {/* Información del producto */}
              <div className="flex-1 space-y-2">
                <h3 className="font-semibold text-sm line-clamp-2">
                  {product.title}
                </h3>
                <p className="text-lg font-bold text-primary">
                  ${product.price.toFixed(2)}
                </p>
                <div className="flex items-center justify-between">
                  {product.type === "SERVICE" ? (
                    <Badge
                      variant="outline"
                      className="border-sky-400 text-sky-700"
                    >
                      Servicio
                    </Badge>
                  ) : (
                    <Badge
                      variant={availableOf(product) > 5 ? "default" : "destructive"}
                    >
                      Stock: {availableOf(product)}
                    </Badge>
                  )}
                  {product.type !== "SERVICE" && (product.reservedCount ?? 0) > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {product.reservedCount} apartado
                      {(product.reservedCount ?? 0) > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Mensaje si no hay productos */}
        {filteredProducts.length === 0 && (
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