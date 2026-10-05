"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { type Product, type Client } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { CardActionButton } from "./card-action-button";
import { ProductDetailsModal } from "./product-details-modal";
import { ExternalLink, FileDown, Loader2, Package, LayoutList } from "lucide-react";
import { toast } from "@/lib/toast";
import { type CutoffPeriod } from "./monthly-cutoff";
import { DashboardContext } from "../../layout";
import { AddProductModal } from "../../inventory/_components/add-product-modal";

interface SupplierProductsListProps {
  products: Product[];
  supplierId: string;
  supplierName: string;
  onProductChanged?: () => void;
  // Periodo que se ve en Corte Mensual; el reporte de existencias usa el
  // mismo (null mientras carga).
  stockPeriod?: CutoffPeriod | null;
}

export function SupplierProductsList({
  products,
  supplierId,
  supplierName,
  onProductChanged,
  stockPeriod,
}: SupplierProductsListProps) {
  const router = useRouter();
  const { clients, suppliers } = React.useContext(DashboardContext) as {
    clients: Client[];
    suppliers: import("@/lib/data").Supplier[];
  };

  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] =
    React.useState(false);

  // Contar productos: "apartados" ahora es cualquier producto con reservedCount > 0.
  const availableCount = products.filter(
    (p) => p.status === "Disponible" && (p.reservedCount ?? 0) === 0
  ).length;
  const apartadoCount = products.filter(
    (p) => (p.reservedCount ?? 0) > 0
  ).length;
  const vendidoCount = products.filter((p) => p.status === "Vendido").length;

  const handleOpenModal = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  const getClientName = (product: Product) => {
    if (!product.clientId) return undefined;
    const client = clients.find((c: Client) => c.id === product.clientId);
    return client?.name;
  };

  const [isExporting, setIsExporting] = React.useState(false);

  // PDF de existencias (#31): lo que hay en tienda y su estado, más lo
  // vendido en el periodo del Corte Mensual. Incluye retirados; la librería
  // de PDF se carga sólo al exportar.
  const handleExportStock = async () => {
    if (!stockPeriod || isExporting) return;
    setIsExporting(true);
    try {
      const res = await fetch(
        `/api/suppliers/${supplierId}/stock-report?from=${stockPeriod.from}&to=${stockPeriod.to}`
      );
      if (!res.ok) {
        const { error: message } = await res.json();
        toast.error(message ?? "No se pudo generar el reporte");
        return;
      }
      const data = await res.json();
      const { exportSupplierStockPdf } = await import("@/lib/pdf/supplier-stock-report");
      await exportSupplierStockPdf({
        ...data,
        supplierName,
        isCurrentPeriod: stockPeriod.isCurrent,
      });
    } catch (err) {
      console.error("Exportar existencias falló", err);
      toast.error("No se pudo generar el reporte");
    } finally {
      setIsExporting(false);
    }
  };

  const handleProductAdded = () => {
    setIsAddProductModalOpen(false);
    onProductChanged?.();
  };

  return (
    <>
      <Card className="flex flex-col h-full">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <LayoutList className="h-5 w-5" />
              <CardTitle className="text-lg">
                Productos ({products.length})
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <CardActionButton
                disabled={!stockPeriod || isExporting}
                onClick={handleExportStock}
                title="PDF con existencias y ventas del periodo del Corte Mensual"
              >
                {isExporting ? <Loader2 className="animate-spin" /> : <FileDown />}
                {isExporting ? "Generando..." : "Existencias"}
              </CardActionButton>
              {products.length > 0 && (
                <CardActionButton
                  onClick={() =>
                    router.push(
                      `/admin/dashboard/inventory?supplier=${supplierId}`
                    )
                  }
                >
                  Ver todos
                  <ExternalLink />
                </CardActionButton>
              )}
            </div>
          </div>

          {products.length > 0 && (
            <div className="flex gap-2">
              {availableCount > 0 && (
                <Badge
                  variant="default"
                  className="bg-my-green-light text-my-green-dark"
                >
                  {availableCount} Disponible
                </Badge>
              )}
              {apartadoCount > 0 && (
                <Badge
                  variant="default"
                  className="bg-my-orange-light text-my-orange-dark"
                >
                  {apartadoCount} Apartado
                </Badge>
              )}
              {vendidoCount > 0 && (
                <Badge
                  variant="default"
                  className="bg-my-red-light text-my-red-dark"
                >
                  {vendidoCount} Vendido
                </Badge>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 min-h-0">
          {/* Radix envuelve el contenido del viewport en un div con
              `display:table` inline, que lo dimensiona a su ancho natural: por
              eso las filas se salían (borde derecho cortado) y el `truncate`
              del título nunca llegaba a aplicarse. Se fuerza a block para que
              respete el ancho del viewport. El padding derecho va en el
              contenido, no en el Root, para que la barra de scroll no se coma
              el borde de las tarjetas. */}
          {products.length > 0 ? (
            <ScrollArea className="h-100 [&>[data-slot=scroll-area-viewport]>div]:block!">
              <div className="space-y-2 pr-4">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="group flex items-center justify-between p-3 border rounded-lg  transition-all hover:shadow-md cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenModal(product);
                    }}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="relative shrink-0">
                        {/* Contenedor de imagen fijo; placeholder cuando no hay foto. */}
                        <div className="w-14 h-14 relative rounded-lg border-2 border-muted overflow-hidden bg-muted flex items-center justify-center shrink-0">
                          {product.photoUrl ? (
                            <Image
                              src={product.photoUrl}
                              alt={product.title}
                              fill
                              sizes="56px"
                              className="object-cover"
                            />
                          ) : (
                            <Package className="h-6 w-6 text-muted-foreground/50" />
                          )}
                        </div>
                        {/* Badge de estado en la imagen: rojo=Vendido,
                            naranja=tiene apartados, verde=Disponible libre.
                            Tono base (no light/dark): son puntos de 12px sin
                            texto, necesitan el color más saturado para leerse. */}
                        <div className="absolute -top-1 -right-1 z-10">
                          {product.status === "Vendido" ? (
                            <div className="h-3 w-3 bg-my-red rounded-full border-2 border-white" />
                          ) : (product.reservedCount ?? 0) > 0 ? (
                            <div className="h-3 w-3 bg-my-orange rounded-full border-2 border-white" />
                          ) : (
                            <div className="h-3 w-3 bg-my-green rounded-full border-2 border-white" />
                          )}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p
                          className="font-medium truncate pr-2 group-hover:text-primary transition-colors"
                          title={product.title}
                        >
                          {product.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm font-semibold text-primary whitespace-nowrap">
                            ${Number(product.price).toFixed(2)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            •
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                            <Package className="h-3 w-3" />
                            {product.type === "SERVICE"
                              ? "Servicio"
                              : `Stock: ${product.quantity}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="opacity-0 bg-white/20 hover:bg-white/40 group-hover:opacity-100 transition-opacity cursor-pointer ml-2 shrink-0"
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
                onClick={() => setIsAddProductModalOpen(true)}
              >
                <Package className="h-4 w-4" />
                Agregar Producto
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ProductDetailsModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        supplierName={supplierName}
        clientName={
          selectedProduct ? getClientName(selectedProduct) : undefined
        }
        onChanged={onProductChanged}
      />

      <AddProductModal
        isOpen={isAddProductModalOpen}
        onClose={() => setIsAddProductModalOpen(false)}
        onAdd={handleProductAdded}
        suppliers={suppliers}
        supplierId={supplierId}
      />
    </>
  );
}
