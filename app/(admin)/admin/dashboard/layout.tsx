"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
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
  type Supplier,
} from "@/lib/data";
import { normalizeProducts, type ApiProduct } from "@/lib/products/normalize";
import { normalizeClients, type ApiClient } from "@/lib/clients/normalize";
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
  isLoadingData: boolean;
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
  reloadSuppliers: () => Promise<void>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
};

// Contexto con valores por defecto
export const DashboardContext = React.createContext<DashboardContextType>({
  isLoadingData: true,
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
  reloadSuppliers: async () => {},
  suppliers: [],
  setSuppliers: () => {},
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
  const [isLoadingData, setIsLoadingData] = React.useState(true);
  const [clients, setClients] = React.useState<Client[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [transactions, setTransactions] = React.useState(initialTransactions);
  const [sales, setSales] = React.useState(initialSales);
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);

  React.useEffect(() => {
    async function loadAll() {
      try {
        const [clientsRes, productsRes, suppliersRes] = await Promise.all([
          fetch("/api/clients"),
          fetch("/api/products?include=all"),
          fetch("/api/suppliers"),
        ]);
        if (clientsRes.ok) {
          const data: ApiClient[] = await clientsRes.json();
          setClients(normalizeClients(data));
        }
        if (productsRes.ok) {
          const data: ApiProduct[] = await productsRes.json();
          setProducts(normalizeProducts(data));
        }
        if (suppliersRes.ok) {
          const data = await suppliersRes.json();
          setSuppliers(data);
        }
      } catch (error) {
        console.error("Error cargando datos iniciales", error);
      } finally {
        setIsLoadingData(false);
      }
    }
    loadAll();
  }, []);

  const reloadSuppliers = async () => {
    try {
      const res = await fetch("/api/suppliers");
      const data = await res.json();
      setSuppliers(data);
    } catch (error) {
      console.error("Error reloading suppliers", error);
    }
  };

  const reloadProducts = async () => {
    try {
      const res = await fetch("/api/products?include=all");
      const data: ApiProduct[] = await res.json();
      setProducts(normalizeProducts(data));
    } catch (error) {
      console.error("Error reloading products", error);
    }
  };

  return (
    <DashboardContext.Provider
      value={{
        isLoadingData,
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
        reloadSuppliers,
        suppliers,
        setSuppliers,
      }}
    >
      <SidebarProvider
        style={
          {
            "--sidebar-width": "19rem",
          } as React.CSSProperties
        }
      >
        <AppSidebar/>
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