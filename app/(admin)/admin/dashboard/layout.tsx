"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AppSidebar, data } from "./_components/app-sidebar";
import {
  type Client,
  initialClients,
  type Product,
  initialProducts,
  type Transaction,
  initialTransactions,
  type Sale,
  initialSales,
} from "@/lib/data";
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

// Tipo del contexto (integrado con tu sistema existente)
type DashboardContextType = {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isAddSupplierModalOpen: boolean;
  setIsAddSupplierModalOpen: (isOpen: boolean) => void;
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  sales: Sale[]; 
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>; 
};

// Contexto con valores por defecto
export const DashboardContext = React.createContext<DashboardContextType>({
  searchTerm: "",
  setSearchTerm: () => {},
  isAddSupplierModalOpen: false,
  setIsAddSupplierModalOpen: () => {},
  clients: initialClients,
  setClients: () => {},
  products: initialProducts,
  setProducts: () => {},
  transactions: initialTransactions,
  setTransactions: () => {},
  sales: initialSales, // NUEVO
  setSales: () => {}, // NUEVO
});

export default function DashboardLayout({
  children,
  username
}: {
  children: React.ReactNode;
  username?: string;
}) {
  console.log("Username en dashboard/layout 1:", username);
  const pathname = usePathname();
  const currentPage = data.navMain.find((item) =>
    pathname.startsWith(item.url)
  );
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] =
    React.useState(false);
  const [clients, setClients] = React.useState(initialClients);
  const [products, setProducts] = React.useState(initialProducts);
  const [transactions, setTransactions] = React.useState(initialTransactions);
  const [sales, setSales] = React.useState(initialSales); 

  return (
    <DashboardContext.Provider
      value={{
        searchTerm,
        setSearchTerm,
        isAddSupplierModalOpen,
        setIsAddSupplierModalOpen,
        clients,
        setClients,
        products,
        setProducts,
        transactions,
        setTransactions,
        sales, // NUEVO
        setSales, // NUEVO
      }}
    >
      <SidebarProvider
        style={
          {
            "--sidebar-width": "19rem",
          } as React.CSSProperties
        }
      >
        <AppSidebar username="admin"/>
        <SidebarInset className="flex-1 flex flex-col h-screen">
          <header className="flex h-16 shrink-0 items-center gap-2 px-4 border-b sticky top-0 z-10 bg-background">
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
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </DashboardContext.Provider>
  );
}