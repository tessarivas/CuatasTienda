"use client";

import * as React from "react";
import { DashboardContext } from "../../layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AssignProductModal } from "../_components/assign-product-modal";
import { AddPaymentModal } from "../_components/add-payment-modal";
import { type Product, type Transaction } from "@/lib/data";
import { use } from "react";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params); 

  const { clients, setClients, products, setProducts, transactions, setTransactions } = React.useContext(DashboardContext);
  
  const [isAssignModalOpen, setIsAssignModalOpen] = React.useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false);

  const client = clients.find((c) => c.id === id);

  const handleAddPayment = (amount: number) => {
    setClients(clients.map(c => c.id === id ? { ...c, balance: c.balance + amount } : c));

    const newTransaction: Transaction = {
      id: `txn-${Date.now()}`,
      clientId: id,
      type: 'abono',
      amount: amount,
      date: new Date().toLocaleDateString('es-MX'),
      details: "Abono a cuenta",
    };
    setTransactions([newTransaction, ...transactions]);
  };

  const handleLiquidate = (product: Product) => {
    if (!client || client.balance < product.price) {
      alert("El saldo no es suficiente para liquidar este producto.");
      return;
    }

    setClients(clients.map(c => c.id === id ? { ...c, balance: c.balance - product.price } : c));

    setProducts(products.map(p => p.id === product.id ? { ...p, status: "Vendido" } : p));

    const newTransaction: Transaction = {
      id: `txn-${Date.now()}`,
      clientId: id,
      type: 'liquidacion',
      amount: -product.price,
      date: new Date().toLocaleDateString('es-MX'),
      details: `Liquidación: ${product.title}`,
    };
    setTransactions([newTransaction, ...transactions]);
  };

  const handleAssignProduct = (productId: string, clientId: string) => {
    setProducts(products.map(p => p.id === productId ? { ...p, status: "Apartado", clientId } : p));
  };
  
  const reservedProducts = products.filter(p => p.clientId === id && p.status === "Apartado");
  const availableProducts = products.filter(p => p.status === 'Disponible');

  if (!client) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center">
          <p className="text-lg font-semibold">Cliente no encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid md:grid-cols-3 gap-6 p-4 md:p-6">
        {/* Columna Principal: Apartados y Saldo */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Panel de Cliente: {client.name}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsPaymentModalOpen(true)}>Registrar Abono</Button>
                <Button onClick={() => setIsAssignModalOpen(true)}>Apartar Producto</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold tracking-tighter">
                ${client.balance.toFixed(2)} MXN
              </div>
              <p className="text-sm text-muted-foreground">Saldo a favor</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Productos Apartados</CardTitle>
            </CardHeader>
            <CardContent>
              {reservedProducts.length > 0 ? (
                <ul className="space-y-3">
                  {reservedProducts.map((product) => (
                    <li key={product.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border rounded-lg gap-2">
                      <div>
                        <p className="font-medium">{product.title}</p>
                        <p className="text-sm text-muted-foreground">Precio: ${product.price.toFixed(2)}</p>
                      </div>
                      <Button
                        size="sm"
                        disabled={client.balance < product.price}
                        onClick={() => handleLiquidate(product)}
                      >
                        Liquidar
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Este cliente no tiene productos apartados.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Columna Derecha: Historial de Movimientos */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Movimientos</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {transactions.filter((t: Transaction) => t.clientId === id).map((t: Transaction) => (
                  <li key={t.id}>
                    <div className="flex justify-between">
                      <p className="font-medium">{t.details}</p>
                      <p className={`font-semibold ${t.type === 'abono' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.type === 'abono' ? '+' : ''}${t.amount.toFixed(2)}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">{t.date}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modales */}
      <AssignProductModal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} onAssign={handleAssignProduct} client={client} availableProducts={availableProducts} />
      <AddPaymentModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} onAddPayment={handleAddPayment} />
    </>
  );
}