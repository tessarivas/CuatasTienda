"use client";

import * as React from "react";
import { DashboardContext } from "../../layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AssignProductModal } from "../_components/assign-product-modal";
import { type Product } from "@/lib/data";
import { use } from "react";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const { clients, products, setProducts } = React.useContext(DashboardContext);
  const [isAssignModalOpen, setIsAssignModalOpen] = React.useState(false);

  const client = clients.find((c) => c.id === id);

  // Encontrar los productos apartados por este cliente
  const reservedProducts = products.filter(
    (p) => p.clientId === id && p.status === "Apartado"
  );
  
  // Encontrar productos que aún están disponibles para apartar
  const availableProducts = products.filter(p => p.status === 'Disponible');

  const handleAssignProduct = (productId: string, clientId: string) => {
    setProducts(
      products.map((p) =>
        p.id === productId
          ? { ...p, status: "Apartado", clientId: clientId }
          : p
      )
    );
  };

  if (!client) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center">
          <p className="text-lg font-semibold">Cliente no encontrado</p>
          <p className="text-sm text-muted-foreground mt-2">
            ID buscado: {id}
          </p>
          <p className="text-sm text-muted-foreground">
            Clientes disponibles: {clients.length}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Detalles del Cliente</CardTitle>
            <Button onClick={() => setIsAssignModalOpen(true)}>
              Apartar Producto
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold">Nombre:</h3>
              <p>{client.name}</p>
            </div>
            <div>
              <h3 className="font-semibold">Teléfono:</h3>
              <p>{client.phone}</p>
            </div>
            <div className="pt-4">
              <h3 className="text-lg font-semibold">Productos Apartados</h3>
              {reservedProducts.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {reservedProducts.map((product) => (
                    <li key={product.id} className="flex justify-between items-center p-2 border rounded-md">
                      <span>{product.title}</span>
                      <span className="font-semibold">{product.price.toFixed(2)} MXN</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">
                  Este cliente no tiene productos apartados.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <AssignProductModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        onAssign={handleAssignProduct}
        client={client}
        availableProducts={availableProducts}
      />
    </>
  );
}