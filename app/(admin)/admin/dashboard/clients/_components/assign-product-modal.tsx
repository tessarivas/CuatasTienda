"use client";

import * as React from "react";
import { type Product, type Client, type Supplier } from "@/lib/data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from "next/image";
import { Search, ShoppingBag, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface AssignProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (productId: string, clientId: string) => void;
  client: Client | null;
  availableProducts: Product[];
  suppliers: Supplier[];
}

export function AssignProductModal({
  isOpen,
  onClose,
  onAssign,
  client,
  availableProducts,
  suppliers,
}: AssignProductModalProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [supplierFilter, setSupplierFilter] = React.useState("todos");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
      setSupplierFilter("todos");
      setSelectedId(null);
    }
  }, [isOpen]);

  // Sólo proveedores con algo que apartar; los demás darían una lista vacía.
  const suppliersWithStock = React.useMemo(() => {
    const ids = new Set(availableProducts.map((p) => String(p.supplierId)));
    return suppliers.filter((s) => ids.has(String(s.id)));
  }, [suppliers, availableProducts]);

  if (!client) return null;

  const filteredProducts = availableProducts.filter(
    (product) =>
      product.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (supplierFilter === "todos" ||
        String(product.supplierId) === supplierFilter)
  );

  const handleAssign = () => {
    if (!selectedId) return;
    onAssign(selectedId, client.id);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Apartar Producto
          </DialogTitle>
          <DialogDescription>
            Elige el producto que se le va a apartar a {client.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              {/* Ancho según el texto (w-fit, default del trigger) para que
                  "Todos los proveedores" no se corte; max-w-56 evita que un
                  nombre largo de proveedor aplaste el buscador. */}
              <SelectTrigger className="max-w-56 shrink-0 cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los proveedores</SelectItem>
                {suppliersWithStock.map((supplier) => (
                  <SelectItem key={supplier.id} value={String(supplier.id)}>
                    {supplier.businessName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground">
            {filteredProducts.length}{" "}
            {filteredProducts.length === 1
              ? "producto disponible"
              : "productos disponibles"}
          </p>

          {filteredProducts.length > 0 ? (
            // div con overflow y no ScrollArea: el wrapper display:table de
            // Radix rompe el truncate de los títulos (ver "UI gotchas").
            // max-h-72 (288px) = 4 filas de 66px + 3 huecos de 8px; a partir
            // de la 5ª se activa el scroll dentro de este espacio.
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {filteredProducts.map((product) => {
                const isSelected = product.id === selectedId;
                // Lo que de verdad se puede apartar, no el total en bodega.
                const available =
                  product.quantity - (product.reservedCount ?? 0);
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() =>
                      setSelectedId((prev) =>
                        prev === product.id ? null : product.id
                      )
                    }
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-3 rounded-lg border p-2 text-left transition-colors hover:border-primary/50",
                      isSelected && "border-primary bg-primary/5"
                    )}
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                      {product.photoUrl ? (
                        <Image
                          src={product.photoUrl}
                          alt={product.title}
                          width={48}
                          height={48}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {product.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {available}{" "}
                        {available === 1 ? "disponible" : "disponibles"}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold">
                      ${product.price.toFixed(2)}
                    </p>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-4 rounded-full bg-muted p-6">
                <Package className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="font-medium text-muted-foreground">
                {searchTerm
                  ? "No se encontraron productos"
                  : "No hay productos disponibles"}
              </p>
              <p className="text-xs text-muted-foreground">
                {searchTerm
                  ? "Intenta con otro término de búsqueda"
                  : "Todos los productos están apartados o vendidos"}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedId}
            className="cursor-pointer"
          >
            Apartar Producto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
