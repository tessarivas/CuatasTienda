"use client";

import * as React from "react";
import { AppSidebar } from "./_components/app-sidebar";
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
import { toast } from "@/lib/toast";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
  useSidebar,
} from "@/components/ui/sidebar";

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
  reloadSuppliers: () => Promise<void>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  // Cada página que lee de aquí (en vez de hacer su propio fetch) necesita
  // saber si el primer fetch todavía está en curso para no mostrar un
  // "no hay nada" falso justo después de entrar/loguearse.
  isLoadingClients: boolean;
  isLoadingProducts: boolean;
  isLoadingSuppliers: boolean;
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
  reloadSuppliers: async () => {},
  suppliers: [],
  setSuppliers: () => {},
  isLoadingClients: true,
  isLoadingProducts: true,
  isLoadingSuppliers: true,
});

// Barra de arriba sólo con el botón del menú, y sólo cuando hace falta: en
// celular (el menú es un panel que se abre encima) o en compu con el menú
// escondido. Con el menú abierto en compu, el botón vive junto al logo
// (app-sidebar.tsx) y esta barra no se muestra. Ya no lleva el nombre de la
// página: cada página tiene su propio título.
function TopBar() {
  const { isMobile, state } = useSidebar();
  if (!isMobile && state === "expanded") return null;
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center border-b bg-background px-4">
      <SidebarTrigger className="-ml-1 cursor-pointer" />
    </header>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] =
    React.useState(false);
  const [clients, setClients] = React.useState<Client[]>([]);
  const [isLoadingClients, setIsLoadingClients] = React.useState(true);

  // Aviso de comprobantes pendientes de días anteriores: una vez por sesión
  // del navegador, al entrar al panel (no en cada cambio de página).
  React.useEffect(() => {
    const KEY = "cuatas:aviso-comprobantes";
    try {
      if (sessionStorage.getItem(KEY)) return;
      sessionStorage.setItem(KEY, "1");
    } catch {
      // Sin sessionStorage (modo privado, etc.) se muestra igual.
    }
    fetch("/api/receipts/pending")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { count: number } | null) => {
        if (!data || data.count === 0) return;
        toast.warning(
          data.count === 1
            ? "Hay 1 comprobante pendiente de días anteriores. Adjúntalo en Corte de Caja."
            : `Hay ${data.count} comprobantes pendientes de días anteriores. Adjúntalos en Corte de Caja.`,
          { duration: 10000 }
        );
      })
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    async function loadClients() {
      try {
        const res = await fetch("/api/clients");
        if (!res.ok) return;
        const data: ApiClient[] = await res.json();
        setClients(normalizeClients(data));
      } catch (error) {
        console.error("Error cargando clientes", error);
      } finally {
        setIsLoadingClients(false);
      }
    }
    loadClients();
  }, []);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = React.useState(true);
  const [transactions, setTransactions] = React.useState(initialTransactions);
  const [sales, setSales] = React.useState(initialSales);

  React.useEffect(() => {
  async function loadProducts() {
    try {
      const res = await fetch("/api/products?include=all");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ApiProduct[] = await res.json();
      setProducts(normalizeProducts(data));
    } catch (error) {
      console.error("Error loading products", error);
    } finally {
      setIsLoadingProducts(false);
    }
  }

  loadProducts();
}, []);

  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/suppliers")
      .then((res) => res.json())
      .then(setSuppliers)
      .finally(() => setIsLoadingSuppliers(false));
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
        reloadSuppliers,
        suppliers,
        setSuppliers,
        isLoadingClients,
        isLoadingProducts,
        isLoadingSuppliers,
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
          <TopBar />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </DashboardContext.Provider>
  );
}