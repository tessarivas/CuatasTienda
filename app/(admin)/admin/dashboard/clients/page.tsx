"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { DashboardContext } from "../layout";
import { type Client } from "@/lib/data";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AddClientModal } from "./_components/add-client-modal";
import { ClientCard } from "./_components/client-card";
import { Search, UserPlus, Users } from "lucide-react";

export default function Page() {
  const router = useRouter();

  const { clients, setClients } = React.useContext(DashboardContext);

  const [searchTerm, setSearchTerm] = React.useState("");
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);

  const handleAddClient = (newClientData: { name: string; phone: string }) => {
    const newClient: Client = {
      ...newClientData,
      id: `cli-${Date.now()}`,
      balance: 0,
    };
    setClients((prevClients) => [newClient, ...prevClients]);
    setIsAddModalOpen(false);
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
              className="pl-9 bg-white/80 border-slate-200"
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

        {/* Estadísticas con colores pastel */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total de clientes */}
          <div className="relative overflow-hidden rounded-xl p-5 bg-yellow-100">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600 mb-1">
                  Total de Clientes
                </p>
                <p className="text-3xl font-bold text-yellow-600">
                  {totalClients}
                </p>
              </div>
            </div>
          </div>

          {/* Clientes con saldo */}
          <div className="relative overflow-hidden rounded-xl p-5 bg-sky-100">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-sky-600 mb-1">
                  Clientes con Saldo
                </p>
                <p className="text-3xl font-bold text-sky-600">
                  {clientsWithBalance}
                </p>
              </div>
            </div>
          </div>

          {/* Saldo total */}
          <div className="relative overflow-hidden rounded-xl p-5 bg-rose-100">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-rose-600 mb-1">
                  Saldo Total entre todos los Clientes
                </p>
                <p className="text-3xl font-bold text-rose-600">
                  ${totalBalance.toLocaleString()}
                </p>
              </div>
            </div>
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
              <div className="absolute inset-0 bg-linear-to-br from-purple-300/30 to-pink-300/30 dark:from-purple-500/10 dark:to-pink-500/10 rounded-full blur-2xl" />
              <div className="relative p-6 bg-linear-to-br from-purple-100 to-pink-100 dark:from-purple-950/30 dark:to-pink-950/30 rounded-full mb-4">
                <Users className="h-12 w-12 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              {searchTerm
                ? "No se encontraron clientes"
                : "No hay clientes registrados"}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 text-center max-w-md">
              {searchTerm
                ? "Intenta con otro término de búsqueda"
                : "Comienza agregando tu primer cliente para llevar el registro de sus compras"}
            </p>
            {!searchTerm && (
              <Button
                variant="outline"
                className="cursor-pointer border-purple-300 hover:bg-purple-50 dark:border-purple-700 dark:hover:bg-purple-950/30"
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
