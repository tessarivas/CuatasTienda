"use client";

import * as React from "react";
import { type Product, type Client } from "@/lib/data";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";
import { Search, ShoppingBag, Package } from "lucide-react";

interface AssignProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (productId: string, clientId: string) => void;
  client: Client | null;
  availableProducts: Product[];
}

export function AssignProductModal({
  isOpen,
  onClose,
  onAssign,
  client,
  availableProducts,
}: AssignProductModalProps) {
  const [searchTerm, setSearchTerm] = React.useState("");

  if (!client) return null;

  const filteredProducts = availableProducts.filter((product) =>
    product.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAssignClick = (productId: string) => {
    onAssign(productId, client.id);
    setSearchTerm("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <div className="p-2 bg-amber-100 rounded-lg">
              <ShoppingBag className="h-6 w-6 text-amber-600" />
            </div>
            Apartar Producto para {client.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Buscador */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar producto por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 text-lg"
            />
          </div>

          {/* Contador */}
          <div className="flex items-center justify-between px-2">
            <p className="text-sm text-muted-foreground">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'producto disponible' : 'productos disponibles'}
            </p>
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchTerm("")}
                className="cursor-pointer"
              >
                Limpiar búsqueda
              </Button>
            )}
          </div>

          {/* Grid de productos */}
          <ScrollArea className="h-[450px]">
            {filteredProducts.length > 0 ? (
              <div className="grid gap-3 pr-4">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="p-4 border-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex gap-4">
                      {/* Imagen */}
                      <div className="relative w-24 h-24 flex-shrink-0">
                        <Image
                          src={product.photoUrl}
                          alt={product.title}
                          fill
                          className="rounded-lg object-cover border-2"
                        />
                        <Badge className="absolute -top-2 -right-2 bg-green-500">
                          Stock: {product.quantity}
                        </Badge>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                          {product.title}
                        </h3>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-3xl font-bold text-blue-600">
                            ${product.price.toFixed(2)}
                          </span>
                          <span className="text-sm text-muted-foreground">MXN</span>
                        </div>
                        <Button
                          size="lg"
                          className="w-full cursor-pointer bg-amber-600 hover:bg-amber-700"
                          onClick={() => handleAssignClick(product.id)}
                        >
                          <ShoppingBag className="mr-2 h-5 w-5" />
                          Apartar este producto
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[400px] text-center">
                <Package className="h-20 w-20 text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  {searchTerm ? "No se encontraron productos" : "No hay productos disponibles"}
                </h3>
                <p className="text-muted-foreground max-w-md">
                  {searchTerm
                    ? "Intenta con otro término de búsqueda"
                    : "Todos los productos están apartados o vendidos"}
                </p>
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 h-12 text-lg cursor-pointer"
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}