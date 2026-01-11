"use client";

import * as React from "react";
import { DashboardContext } from "../../layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { use } from "react";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const { clients } = React.useContext(DashboardContext);
  
  console.log("Params ID:", id); 
  console.log("Todos los clientes:", clients);
  
  const client = clients.find((c) => c.id === id);

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
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Detalles del Cliente</CardTitle>
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
            <h3 className="text-lg font-semibold">Historial de Compras</h3>
            <p className="text-sm text-muted-foreground">
              (Próximamente...)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}