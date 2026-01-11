"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { DashboardContext } from "../layout";
import { type Client } from "@/lib/data";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AddClientModal } from "./_components/add-client-modal";
import { ClientCard } from "./_components/client-card";

export default function Page() {
  const router = useRouter();
  
  const { clients, setClients } = React.useContext(DashboardContext);
  
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);

  const handleAddClient = (newClientData: { name: string; phone: string }) => {
    const newClient: Client = {
      ...newClientData,
      id: `cli-${Date.now()}`,
      balance: 0, // <-- Añadimos el balance inicial
    };
    setClients((prevClients) => [newClient, ...prevClients]);
    setIsAddModalOpen(false); // <-- Cerramos el modal aquí
  };

  const handleCardClick = (clientId: string) => {
    router.push(`/admin/dashboard/clients/${clientId}`);
  };

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        {/* Barra de Búsqueda y Acciones */}
        <div className="flex items-center gap-4">
          <Input
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <div className="ml-auto">
            <Button
              className="cursor-pointer"
              onClick={() => setIsAddModalOpen(true)}
            >
              Agregar Cliente
            </Button>
          </div>
        </div>

        {/* Grid de Clientes */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredClients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onClick={() => handleCardClick(client.id)}
            />
          ))}
        </div>
      </div>

      {/* Modal para agregar cliente */}
      <AddClientModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddClient}
      />
    </>
  );
}