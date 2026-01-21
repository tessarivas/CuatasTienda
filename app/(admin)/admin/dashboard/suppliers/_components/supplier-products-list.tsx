"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { type Product, type Client } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ProductDetailsModal } from "./product-details-modal";
import { ExternalLink, Package, LayoutList } from "lucide-react";
import { DashboardContext } from "../../layout";

interface SupplierProductsListProps {
  products: Product[];
  supplierId: string;
  supplierName: string; // Agregado para pasar al modal
}

export function SupplierProductsList({
  products,
  supplierId,
  supplierName,
}: SupplierProductsListProps) {
  const router = useRouter();
  const { clients } = React.useContext(DashboardContext) as { clients: Client[] };
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  // Contar productos por estado
  const availableCount = products.filter(p => p.status === "Disponible").length;
  const apartadoCount = products.filter(p => p.status === "Apartado").length;
  const vendidoCount = products.filter(p => p.status === "Vendido").length;

  const handleOpenModal = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  // Obtener nombre del cliente si el producto está apartado
  const getClientName = (product: Product) => {
    if (!product.clientId) return undefined;
    const client = clients.find((c: Client) => c.id === product.clientId);
    return client?.name;
  };

  return (
    <>
      <Card className="flex flex-col h-full">
        <CardHeader>
          <div className="flex items-center justify-between -mt-1">
            <div className="flex items-center gap-2">
              <LayoutList className="h-5 w-5" />
              <CardTitle className="text-lg">
                Productos ({products.length})
              </CardTitle>
            </div>
            {products.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  router.push(
                    `/admin/dashboard/inventory?supplier=${supplierId}`,
                  )
                }
                className="cursor-pointer text-primary"
              >
                Ver todos
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Resumen de estados */}
          {products.length > 0 && (
            <div className="flex gap-2">
              {availableCount > 0 && (
                <Badge variant="default" className="bg-green-500">
                  {availableCount} Disponible
                </Badge>
              )}
              {apartadoCount > 0 && (
                <Badge variant="default" className="bg-amber-500">
                  {apartadoCount} Apartado
                </Badge>
              )}
              {vendidoCount > 0 && (
                <Badge variant="default" className="bg-rose-500">
                  {vendidoCount} Vendido
                </Badge>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 min-h-0">
          {products.length > 0 ? (
            // Altura fija con scroll
            <ScrollArea className="h-100 pr-4">
              <div className="space-y-2">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="group flex items-center justify-between p-3 border rounded-lg hover:bg-linear-to-r hover:from-transparent hover:to-primary/5 transition-all hover:shadow-md cursor-pointer"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleOpenModal(product);
                      }}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="relative">
                        <Image
                          src={product.photoUrl}
                          alt={product.title}
                          width={56}
                          height={56}
                          className="rounded-lg object-cover aspect-square border-2 border-muted"
                        />
                        {/* Badge de estado en la imagen */}
                        <div className="absolute -top-1 -right-1">
                          {product.status === "Disponible" && (
                            <div className="h-3 w-3 bg-green-500 rounded-full border-2 border-white" />
                          )}
                          {product.status === "Apartado" && (
                            <div className="h-3 w-3 bg-amber-500 rounded-full border-2 border-white" />
                          )}
                          {product.status === "Vendido" && (
                            <div className="h-3 w-3 bg-rose-500 rounded-full border-2 border-white" />
                          )}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate group-hover:text-primary transition-colors">
                          {product.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm font-semibold text-primary">
                            ${product.price.toFixed(2)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            •
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            Stock: {product.quantity}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="opacity-0 bg-white/20 hover:bg-white/40 group-hover:opacity-100 transition-opacity cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenModal(product);
                      }}
                    >
                      Ver
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center h-100 text-center">
              <div className="rounded-full bg-muted p-6 mb-4">
                <Package className="h-12 w-12 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium mb-2">
                No hay productos registrados
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Comienza agregando productos de este proveedor
              </p>
              <Button
                variant="default"
                className="cursor-pointer"
                onClick={() =>
                  router.push(
                    `/admin/dashboard/inventory?supplier=${supplierId}`,
                  )
                }
              >
                <Package className="mr-2 h-4 w-4" />
                Agregar Producto
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de detalles del producto */}
      <ProductDetailsModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        supplierName={supplierName}
        clientName={selectedProduct ? getClientName(selectedProduct) : undefined}
      />
    </>
  );
}
