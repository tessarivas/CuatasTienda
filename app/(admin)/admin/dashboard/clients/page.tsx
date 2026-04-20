"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { DashboardContext } from "../layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AddClientModal } from "./_components/add-client-modal";
import { ClientCard } from "./_components/client-card";
import { Search, UserPlus, Users } from "lucide-react";
import { normalizeClient, type ApiClient } from "@/lib/clients/normalize";

export default function Page() {
  const router = useRouter();

  const { clients, setClients } = React.useContext(DashboardContext);

  const [searchTerm, setSearchTerm] = React.useState("");
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);

  const handleAddClient = async (newClientData: {
    name: string;
    phone: string;
  }) => {
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newClientData.name,
          cellphone: newClientData.phone,
        }),
      });
      if (!res.ok) {
        const { error: message } = await res.json();
        alert(message ?? "No se pudo crear el cliente");
        return;
      }
      const created: ApiClient = await res.json();
      setClients((prev) => [normalizeClient(created), ...prev]);
      setIsAddModalOpen(false);
    } catch {
      alert("No se pudo crear el cliente");
    }
  };

  const handleCardClick = (clientId: string) => {
    router.push(`/admin/dashboard/clients/${clientId}`);
  };

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Calcular estadísticas
  const totalClients = clients.length;
  const clientsWithBalance = clients.filter((c) => c.balance > 0).length;
  const totalBalance = clients.reduce((sum, c) => sum + c.balance, 0);

  return (
    <>
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        {/* Barra de Búsqueda y Acciones */}
        <div className="flex flex-col justify-between sm:flex-row items-stretch sm:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            className="cursor-pointer"
            onClick={() => setIsAddModalOpen(true)}
          >
            <UserPlus className="h-4 w-4" />
            Agregar Cliente
          </Button>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="relative overflow-hidden rounded-xl p-5 bg-my-yellow-light">
            <p className="text-sm font-medium text-my-yellow-dark mb-1">
              Total de Clientes
            </p>
            <p className="text-3xl font-bold text-my-yellow-dark">
              {totalClients}
            </p>
          </div>
          <div className="relative overflow-hidden rounded-xl p-5 bg-my-blue-light">
            <p className="text-sm font-medium text-my-blue-dark mb-1">
              Clientes con Saldo
            </p>
            <p className="text-3xl font-bold text-my-blue-dark">
              {clientsWithBalance}
            </p>
          </div>
          <div className="relative overflow-hidden rounded-xl p-5 bg-my-red-light">
            <p className="text-sm font-medium text-my-red-dark mb-1">
              Saldo Total
            </p>
            <p className="text-3xl font-bold text-my-red-dark">
              ${totalBalance.toLocaleString()}
            </p>
          </div>
        </div>
        {/* Grid de Clientes */}
        {filteredClients.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredClients.map((client, index) => (
              <ClientCard
                key={client.id}
                client={client}
                onClick={() => handleCardClick(client.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="relative">
              <div className="absolute inset-0 bg-linear-to-br from-my-blue-light/30 to-my-yellow-light/30 rounded-full blur-2xl" />
              <div className="relative p-6 bg-linear-to-br from-my-blue-light to-my-yellow-light rounded-full mb-4">
                <Users className="h-12 w-12 text-my-blue-dark" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {searchTerm
                ? "No se encontraron clientes"
                : "No hay clientes registrados"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
              {searchTerm
                ? "Intenta con otro término de búsqueda"
                : "Comienza agregando tu primer cliente para llevar el registro de sus compras"}
            </p>
            {!searchTerm && (
              <Button
                variant="outline"
                className="cursor-pointer"
                onClick={() => setIsAddModalOpen(true)}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Agregar Primer Cliente
              </Button>
            )}
          </div>
        )}
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
