"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { AppSidebar, data } from "./_components/app-sidebar";
import { initialClients, type Client } from "@/lib/data";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";

// Tipo del contexto
type DashboardContextType = {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isAddSupplierModalOpen: boolean;
  setIsAddSupplierModalOpen: (isOpen: boolean) => void;
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
};

// Contexto con valores por defecto
export const DashboardContext = React.createContext<DashboardContextType>({
  searchTerm: "",
  setSearchTerm: () => {},
  isAddSupplierModalOpen: false,
  setIsAddSupplierModalOpen: () => {},
  clients: initialClients, // Importante: usar los datos iniciales aquí
  setClients: () => {},
});

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const currentPage = data.navMain.find((item) =>
    pathname.startsWith(item.url)
  );
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = React.useState(false);
  
  // NUEVO: Estado de clientes en el layout
  const [clients, setClients] = React.useState<Client[]>(initialClients);

  const showSearchBar = pathname.startsWith("/admin/dashboard/suppliers");

  return (
    <DashboardContext.Provider 
      value={{ 
        searchTerm, 
        setSearchTerm, 
        isAddSupplierModalOpen, 
        setIsAddSupplierModalOpen,
        clients, // Compartir el estado
        setClients, // Compartir el setter
      }}
    >
      <SidebarProvider
        style={
          {
            "--sidebar-width": "19rem",
          } as React.CSSProperties
        }
      >
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col">
          <header className="flex h-16 shrink-0 items-center gap-2 px-4 border-b">
            <SidebarTrigger className="-ml-1 cursor-pointer" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    {currentPage?.title ?? "Dashboard"}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            {showSearchBar && (
              <div className="flex-1 flex justify-center">
                <Input
                  placeholder="Buscar proveedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full max-w-md"
                />
              </div>
            )}
          </header>
          <main className="flex-1">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </DashboardContext.Provider>
  );
}