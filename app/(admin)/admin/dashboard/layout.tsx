"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { AppSidebar, data } from "./_components/app-sidebar";
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

// 1. Renombramos el contexto para que sea más general
export const DashboardContext = React.createContext({
  searchTerm: "",
  setSearchTerm: (term: string) => {},
  isAddSupplierModalOpen: false,
  setIsAddSupplierModalOpen: (isOpen: boolean) => {},
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
  // 2. Añadimos el estado para el nuevo modal
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = React.useState(false);

  // Solo mostramos el buscador en la página de proveedores
  const showSearchBar = pathname.startsWith("/admin/dashboard/suppliers");

  return (
    // 3. Pasamos el nuevo estado y su setter al provider
    <DashboardContext.Provider 
      value={{ 
        searchTerm, 
        setSearchTerm, 
        isAddSupplierModalOpen, 
        setIsAddSupplierModalOpen 
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