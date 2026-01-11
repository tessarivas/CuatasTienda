"use client";

import './globals.css'
import { Inter } from 'next/font/google'
import { cn } from '@/lib/utils'
import * as React from "react";
import { type Client, initialClients, type Product, initialProducts, type Transaction, initialTransactions } from "@/lib/data";

const inter = Inter({ subsets: ['latin'] })

export const DashboardContext = React.createContext({
  products: initialProducts as Product[],
  setProducts: (products: Product[]) => {},
  transactions: initialTransactions as Transaction[],
  setTransactions: (transactions: Transaction[]) => {},
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [clients, setClients] = React.useState(initialClients);
  const [products, setProducts] = React.useState(initialProducts);
  const [transactions, setTransactions] = React.useState(initialTransactions);

  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background text-foreground antialiased isolate',
          inter.className
        )}
      >
        <DashboardContext.Provider
          value={{
            products,
            setProducts,
            transactions,
            setTransactions,
          }}
        >
          {children}
        </DashboardContext.Provider>
      </body>
    </html>
  )
}
