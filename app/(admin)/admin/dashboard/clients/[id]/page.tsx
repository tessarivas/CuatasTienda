"use client";

import * as React from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { DashboardContext } from "../../layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AssignProductModal } from "../_components/assign-product-modal";
import { AddPaymentModal } from "../_components/add-payment-modal";
import { type Product, type Transaction } from "@/lib/data";
import {
  ArrowLeft,
  Plus,
  Minus,
  ShoppingBag,
  DollarSign,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const {
    clients,
    setClients,
    products,
    setProducts,
    transactions,
    setTransactions,
  } = React.useContext(DashboardContext);

  const [isAssignModalOpen, setIsAssignModalOpen] = React.useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false);
  const [showLiquidateAllDialog, setShowLiquidateAllDialog] =
    React.useState(false);

  const client = clients.find((c) => c.id === id);

  const handleAddPayment = (amount: number) => {
    setClients(
      clients.map((c) =>
        c.id === id ? { ...c, balance: c.balance + amount } : c,
      ),
    );

    const newTransaction: Transaction = {
      id: `txn-${Date.now()}`,
      clientId: id,
      type: "abono",
      amount: amount,
      date: new Date().toLocaleDateString("es-MX"),
      details: "Abono a cuenta",
    };
    setTransactions([newTransaction, ...transactions]);
  };

  const handleLiquidate = (product: Product) => {
    if (!client || client.balance < product.price) {
      alert("El saldo no es suficiente para liquidar este producto.");
      return;
    }

    setClients(
      clients.map((c) =>
        c.id === id ? { ...c, balance: c.balance - product.price } : c,
      ),
    );

    setProducts(
      products.map((p) =>
        p.id === product.id ? { ...p, status: "Vendido", clientId: null } : p,
      ),
    );

    const newTransaction: Transaction = {
      id: `txn-${Date.now()}`,
      clientId: id,
      type: "liquidacion",
      amount: -product.price,
      date: new Date().toLocaleDateString("es-MX"),
      details: `Liquidación: ${product.title}`,
    };
    setTransactions([newTransaction, ...transactions]);
  };

  const handleLiquidateAll = () => {
    if (!client) return;

    const totalToPay = reservedProducts.reduce((sum, p) => sum + p.price, 0);

    if (client.balance < totalToPay) {
      alert(
        `El saldo no es suficiente. Se necesitan $${totalToPay.toFixed(2)} MXN`,
      );
      return;
    }

    // Actualizar saldo del cliente
    setClients(
      clients.map((c) =>
        c.id === id ? { ...c, balance: c.balance - totalToPay } : c,
      ),
    );

    // Marcar todos los productos como vendidos
    const productIds = reservedProducts.map((p) => p.id);
    setProducts(
      products.map((p) =>
        productIds.includes(p.id)
          ? { ...p, status: "Vendido", clientId: null }
          : p,
      ),
    );

    // Crear transacción por cada producto
    const newTransactions = reservedProducts.map((product) => ({
      id: `txn-${Date.now()}-${product.id}`,
      clientId: id,
      type: "liquidacion" as const,
      amount: -product.price,
      date: new Date().toLocaleDateString("es-MX"),
      details: `Liquidación: ${product.title}`,
    }));

    setTransactions([...newTransactions, ...transactions]);
    setShowLiquidateAllDialog(false);
  };

  const handleAssignProduct = (productId: string, clientId: string) => {
    setProducts(
      products.map((p) =>
        p.id === productId ? { ...p, status: "Apartado", clientId } : p,
      ),
    );
  };

  const reservedProducts = products.filter(
    (p) => p.clientId === id && p.status === "Apartado",
  );
  const availableProducts = products.filter((p) => p.status === "Disponible");
  const clientTransactions = transactions.filter((t) => t.clientId === id);

  const totalReservedValue = reservedProducts.reduce(
    (sum, p) => sum + p.price,
    0,
  );
  const remainingBalance = client ? client.balance - totalReservedValue : 0;

  if (!client) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center">
          <p className="text-lg font-semibold">Cliente no encontrado</p>
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="mt-4 cursor-pointer"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6 p-4 md:p-6 w-full">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{client.name}</h1>
            <p className="text-sm text-muted-foreground">Cuenta del cliente</p>
          </div>
        </div>

        {/* Tarjeta de Saldo Grande */}
        <Card className="border-0 bg-green-50">
          <CardHeader>
            <CardTitle className="text-lg text-green-600">
              Saldo Disponible
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 -mt-4">
            <div className="text-6xl font-bold text-green-700">
              ${client.balance.toFixed(2)}
            </div>
            <p className="text-sm text-green-600">
              Dinero que {client.name} tiene abonado.
            </p>

            {/* Botones de Acción Grandes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
              <Button
                size="lg"
                className="h-16 text-lg cursor-pointer bg-green-600 hover:bg-green-700"
                onClick={() => setIsPaymentModalOpen(true)}
              >
                <Plus className="h-10 w-10" />
                Agregar Abono
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-16 text-lg cursor-pointer border-2"
                onClick={() => setIsAssignModalOpen(true)}
              >
                <ShoppingBag className="h-10 w-10" />
                Apartar Producto
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Grid de 2 columnas */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Productos Apartados */}
          <Card className="border-2 py-0">
            <CardHeader className="bg-secondary py-4">
              <div className="flex items-center justify-between -mb-2">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Productos Apartados
                </CardTitle>
                <Badge className="text-lg px-3">
                  {reservedProducts.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              {reservedProducts.length > 0 ? (
                <div className="space-y-4">
                  {/* Lista de productos */}
                  <div className="space-y-3">
                    {reservedProducts.map((product) => (
                      <div
                        key={product.id}
                        className="p-4 border-2 rounded-lg bg-white transition-colors"
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <p className="font-semibold text-lg">
                              {product.title}
                            </p>
                            <p className="text-2xl font-bold text-primary mt-1">
                              ${product.price.toFixed(2)}
                            </p>
                          </div>
                          <Button
                            size="lg"
                            className="cursor-pointer bg-rose-600 hover:bg-rose-700"
                            disabled={client.balance < product.price}
                            onClick={() => handleLiquidate(product)}
                          >
                            <Minus className="h-4 w-4" />
                            Marcar como Vendido
                          </Button>
                        </div>
                        {client.balance < product.price && (
                          <p className="text-sm font-semibold text-rose-400">
                            Falta abonar $
                            {(product.price - client.balance).toFixed(2)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Resumen de totales */}
                  <div className="p-4 bg-amber-100 rounded-lg border-0">
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-semibold text-amber-600">Total apartado:</span>
                      <span className="text-2xl font-bold text-amber-600">
                        ${totalReservedValue.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Botón Liquidar Todo */}
                  {reservedProducts.length > 1 && (
                    <Button
                      size="lg"
                      className="w-full h-14 text-lg cursor-pointer bg-blue-600 hover:bg-blue-700"
                      onClick={() => setShowLiquidateAllDialog(true)}
                      disabled={client.balance < totalReservedValue}
                    >
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      Liquidar Cuenta ({reservedProducts.length} productos)
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg text-muted-foreground">
                    No hay productos apartados
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Usa el botón "Apartar Producto" para agregar
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Historial */}
          <Card className="border-2 py-0">
            <CardHeader className="bg-secondary py-4">
                <CardTitle className="text-xl flex items-center gap-2 mt-1">
                <DollarSign className="h-5 w-5 text-primary" />
                Historial de Movimientos
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-6">
              {clientTransactions.length > 0 ? (
                <div className="space-y-3 max-h-150 overflow-y-auto">
                  {clientTransactions.map((t) => (
                    <div
                      key={t.id}
                      className={`p-4 border-2 rounded-lg ${
                        t.type === "abono"
                          ? "bg-green-50 border-green-200"
                          : "bg-red-50 border-red-200"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-semibold text-lg">{t.details}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {t.date}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-2xl font-bold ${
                              t.type === "abono"
                                ? "text-green-700"
                                : "text-red-700"
                            }`}
                          >
                            {t.type === "abono" ? "+" : "-"}$
                            {Math.abs(t.amount).toFixed(2)}
                          </p>
                          {t.type === "abono" && (
                            <Badge className="mt-1 bg-green-600">Abono</Badge>
                          )}
                          {t.type === "liquidacion" && (
                            <Badge className="mt-1 bg-red-600">Pago</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <DollarSign className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg text-muted-foreground">
                    No hay movimientos registrados
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modales */}
      <AssignProductModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        onAssign={handleAssignProduct}
        client={client}
        availableProducts={availableProducts}
      />
      <AddPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onAddPayment={handleAddPayment}
      />

      {/* Dialog de confirmación para liquidar todo */}
      <AlertDialog
        open={showLiquidateAllDialog}
        onOpenChange={setShowLiquidateAllDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl">
              ¿Liquidar todos los productos?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base space-y-3 pt-4">
              <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <p className="font-semibold text-blue-900 mb-2">
                  Se van a liquidar {reservedProducts.length} productos:
                </p>
                <ul className="space-y-1 text-sm text-blue-800">
                  {reservedProducts.map((p) => (
                    <li key={p.id}>
                      • {p.title} - ${p.price.toFixed(2)}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg border-2 border-amber-200 space-y-2">
                <div className="flex justify-between text-base">
                  <span>Total a pagar:</span>
                  <span className="font-bold text-amber-900">
                    ${totalReservedValue.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-base">
                  <span>Saldo actual:</span>
                  <span className="font-bold text-green-700">
                    ${client.balance.toFixed(2)}
                  </span>
                </div>
                <div className="h-px bg-amber-300" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Sobrante:</span>
                  <span className="text-green-700">
                    ${remainingBalance.toFixed(2)}
                  </span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLiquidateAll}
              className="bg-blue-600 hover:bg-blue-700 cursor-pointer"
            >
              Sí, liquidar todo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
