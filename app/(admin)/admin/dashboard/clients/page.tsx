"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { DashboardContext } from "../layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AddClientModal } from "./_components/add-client-modal";
import { ClientCard } from "./_components/client-card";
import { Loader2, Search, UserCheck, UserPlus, Users, Wallet } from "lucide-react";
import { StatCard, STAT_ROW } from "../_components/stat-card";
import { formatMoney } from "../sales/sales-utils";
import { normalizeClient, type ApiClient } from "@/lib/clients/normalize";
import { toast } from "@/lib/toast";

export default function Page() {
  const router = useRouter();

  const { clients, setClients, isLoadingClients } =
    React.useContext(DashboardContext);

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
        toast.error(message ?? "No se pudo crear el cliente");
        return;
      }
      const created: ApiClient = await res.json();
      setClients((prev) => [normalizeClient(created), ...prev]);
      setIsAddModalOpen(false);
      toast.success(`Cliente ${created.name} agregado`);
    } catch {
      toast.error("No se pudo crear el cliente");
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

  // Mismo loader que suppliers/[id]: clients viene de DashboardContext
  // (fetch en layout.tsx), no de un fetch propio de esta página.
  if (isLoadingClients) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 h-full">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando clientes...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 space-y-4">
        {/* Mismo layout que "Lista de Proveedores": título a la izquierda,
            búsqueda + CTA a la derecha, en la misma línea. */}
        <div className="flex flex-col md:flex-row md:items-center md:gap-4">
          <h1 className="text-2xl font-bold">Apartados y Crédito de Clientes</h1>
          <div className="mt-4 md:mt-0 md:ml-auto flex items-center gap-2">
            <div className="relative grow">
              <Input
                placeholder="Buscar por nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-lg pl-10"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
            <Button
              className="cursor-pointer"
              onClick={() => setIsAddModalOpen(true)}
            >
              <UserPlus />
              Agregar Cliente
            </Button>
          </div>
        </div>

        {/* Highlights (StatCard), mismo formato en todas las páginas. El
            saldo es dinero a favor, no deuda, así que va en verde. */}
        <div className={STAT_ROW}>
          <StatCard
            color="yellow"
            icon={Users}
            title="Total de Clientes"
            value={totalClients}
            hint="Registrados en la tienda"
          />
          <StatCard
            color="blue"
            icon={UserCheck}
            title="Clientes con Saldo"
            value={clientsWithBalance}
            hint="Con abonos a su favor"
          />
          <StatCard
            color="green"
            icon={Wallet}
            title="Saldo Total entre todos los Clientes"
            value={formatMoney(totalBalance)}
            hint="Dinero abonado que la tienda guarda"
          />
        </div>
        {/* Grid de Clientes */}
        {filteredClients.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            {/* Mismo tratamiento neutral que el estado vacío de
                supplier-products-list.tsx: círculo bg-muted, sin degradado
                morado/rosa ni glow — la app no usa ese acento en ningún
                otro lado. */}
            <div className="rounded-full bg-muted p-6 mb-4">
              <Users className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
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
                <UserPlus />
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
