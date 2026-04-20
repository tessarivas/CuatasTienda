"use client";

import * as React from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { DashboardContext } from "../../layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AssignProductModal } from "../_components/assign-product-modal";
import {
  AddPaymentModal,
  type PaymentMethod,
} from "../_components/add-payment-modal";
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
import {
  normalizeClient,
  type ApiClient,
} from "@/lib/clients/normalize";

type ActiveLayaway = {
  id: number;
  status: string;
  LayawayItem: Array<{
    id: number;
    productId: number;
    price: string | number;
    Product: {
      id: number;
      title: string;
      price: string | number;
      status: string;
      picture: string | null;
      quantity: number | null;
    };
  }>;
} | null;

type Movement =
  | {
      type: "abono";
      id: number;
      date: string;
      amount: string;
      method: string;
    }
  | {
      type: "liquidacion";
      id: number;
      date: string;
      amount: string;
      items: { productId: number; title: string; finalPrice: string }[];
    };

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { clients, setClients, products, setProducts } =
    React.useContext(DashboardContext);

  const [layaway, setLayaway] = React.useState<ActiveLayaway>(null);
  const [movements, setMovements] = React.useState<Movement[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = React.useState(true);

  const [isAssignModalOpen, setIsAssignModalOpen] = React.useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false);
  const [showLiquidateAllDialog, setShowLiquidateAllDialog] =
    React.useState(false);
  const [actionInFlight, setActionInFlight] = React.useState(false);

  const client = clients.find((c) => c.id === id) ?? null;

  const reloadClient = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${id}`);
      if (!res.ok) return;
      const data: ApiClient = await res.json();
      const normalized = normalizeClient(data);
      setClients((prev) =>
        prev.some((c) => c.id === normalized.id)
          ? prev.map((c) => (c.id === normalized.id ? normalized : c))
          : [normalized, ...prev]
      );
    } catch {
      /* silencioso — el UI sigue usando el estado previo */
    }
  }, [id, setClients]);

  const reloadLayaway = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${id}/layaway`);
      if (!res.ok) return;
      const data: ActiveLayaway = await res.json();
      setLayaway(data);
    } catch {
      /* ignore */
    }
  }, [id]);

  const reloadMovements = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${id}/movements`);
      if (!res.ok) return;
      const data: Movement[] = await res.json();
      setMovements(data);
    } catch {
      /* ignore */
    }
  }, [id]);

  React.useEffect(() => {
    (async () => {
      await Promise.all([reloadClient(), reloadLayaway(), reloadMovements()]);
      setIsLoadingDetail(false);
    })();
  }, [reloadClient, reloadLayaway, reloadMovements]);

  const reservedItems = React.useMemo(() => {
    const items = layaway?.LayawayItem ?? [];
    return items.map((item) => ({
      itemId: item.id,
      productId: item.productId,
      title: item.Product.title,
      price: Number(item.price),
    }));
  }, [layaway]);

  const availableProducts = React.useMemo(
    () =>
      products.filter(
        (p) =>
          p.status === "Disponible" &&
          p.quantity - (p.reservedCount ?? 0) > 0
      ),
    [products]
  );

  const totalReservedValue = reservedItems.reduce(
    (sum, p) => sum + p.price,
    0
  );
  const remainingBalance = client
    ? client.balance - totalReservedValue
    : 0;

  // --- Handlers ---

  const handleAddPayment = async (amount: number, method: PaymentMethod) => {
    if (actionInFlight) return;
    setActionInFlight(true);
    try {
      const res = await fetch(`/api/clients/${id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amount.toFixed(2), method }),
      });
      if (!res.ok) {
        const { error: message } = await res.json();
        alert(message ?? "No se pudo registrar el abono");
        return;
      }
      const { client: updatedClient }: { client: ApiClient } = await res.json();
      setClients((prev) =>
        prev.map((c) =>
          c.id === id ? normalizeClient(updatedClient) : c
        )
      );
      await reloadMovements();
      setIsPaymentModalOpen(false);
    } catch {
      alert("No se pudo registrar el abono");
    } finally {
      setActionInFlight(false);
    }
  };

  const handleAssignProduct = async (productId: string) => {
    if (actionInFlight) return;
    setActionInFlight(true);
    try {
      const res = await fetch(`/api/clients/${id}/layaway/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: Number(productId) }),
      });
      if (!res.ok) {
        const { error: message } = await res.json();
        alert(message ?? "No se pudo apartar el producto");
        return;
      }
      // Reflejar en contexto: subimos el conteo de reservas del producto.
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? { ...p, reservedCount: (p.reservedCount ?? 0) + 1 }
            : p
        )
      );
      await reloadLayaway();
      setIsAssignModalOpen(false);
    } catch {
      alert("No se pudo apartar el producto");
    } finally {
      setActionInFlight(false);
    }
  };

  const liquidateItems = async (itemIds: number[]) => {
    if (actionInFlight || itemIds.length === 0) return;
    setActionInFlight(true);
    try {
      const res = await fetch(`/api/clients/${id}/layaway/liquidate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds }),
      });
      if (!res.ok) {
        const { error: message, faltante } = await res.json();
        alert(
          faltante
            ? `${message} Faltan $${faltante} MXN.`
            : (message ?? "No se pudo liquidar")
        );
        return;
      }
      const { client: updatedClient }: { client: ApiClient } = await res.json();
      setClients((prev) =>
        prev.map((c) =>
          c.id === id ? normalizeClient(updatedClient) : c
        )
      );
      // Cada item liquidado consume 1 unidad y 1 reserva del producto.
      // Si el stock queda en 0 el backend flipea a "Vendido"; en otro caso
      // mantiene "Disponible".
      const liquidatedProductIds = reservedItems
        .filter((r) => itemIds.includes(r.itemId))
        .map((r) => String(r.productId));
      setProducts((prev) =>
        prev.map((p) => {
          if (!liquidatedProductIds.includes(p.id)) return p;
          const newQty = Math.max(0, p.quantity - 1);
          const newReserved = Math.max(0, (p.reservedCount ?? 0) - 1);
          return {
            ...p,
            quantity: newQty,
            reservedCount: newReserved,
            status: newQty === 0 ? ("Vendido" as const) : p.status,
          };
        })
      );
      await Promise.all([reloadLayaway(), reloadMovements()]);
      setShowLiquidateAllDialog(false);
    } catch {
      alert("No se pudo liquidar");
    } finally {
      setActionInFlight(false);
    }
  };

  const handleLiquidateOne = (itemId: number) => liquidateItems([itemId]);
  const handleLiquidateAll = () =>
    liquidateItems(reservedItems.map((r) => r.itemId));

  // --- Render ---

  if (!client && !isLoadingDetail) {
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

  if (!client) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Cargando...</p>
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

        {/* Tarjeta de Saldo */}
        <Card className="border-0 bg-my-blue-light/40">
          <CardHeader>
            <CardTitle className="text-lg text-my-blue-dark">
              Saldo Disponible
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 -mt-4">
            <div className="text-6xl font-bold text-my-blue-dark">
              ${client.balance.toFixed(2)}
            </div>
            <p className="text-sm text-my-blue-dark/70">
              Dinero que {client.name} tiene abonado.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
              <Button
                size="lg"
                className="h-16 text-lg cursor-pointer bg-my-blue hover:bg-my-blue-dark"
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

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Productos Apartados */}
          <Card className="border-2 py-0">
            <CardHeader className="bg-secondary py-4">
              <div className="flex items-center justify-between -mb-2">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Productos Apartados
                </CardTitle>
                <Badge className="text-lg px-3">{reservedItems.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              {reservedItems.length > 0 ? (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {reservedItems.map((item) => (
                      <div
                        key={item.itemId}
                        className="p-4 border-2 rounded-lg bg-white transition-colors"
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <p className="font-semibold text-lg">
                              {item.title}
                            </p>
                            <p className="text-2xl font-bold text-primary mt-1">
                              ${item.price.toFixed(2)}
                            </p>
                          </div>
                          <Button
                            size="lg"
                            className="cursor-pointer bg-rose-600 hover:bg-rose-700"
                            disabled={
                              actionInFlight || client.balance < item.price
                            }
                            onClick={() => handleLiquidateOne(item.itemId)}
                          >
                            <Minus className="h-4 w-4" />
                            Marcar como Vendido
                          </Button>
                        </div>
                        {client.balance < item.price && (
                          <p className="text-sm font-semibold text-rose-400">
                            Falta abonar ${(item.price - client.balance).toFixed(2)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-my-yellow-light rounded-lg border-0">
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-semibold text-my-yellow-dark">
                        Total apartado:
                      </span>
                      <span className="text-2xl font-bold text-my-yellow-dark">
                        ${totalReservedValue.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {reservedItems.length > 1 && (
                    <Button
                      size="lg"
                      className="w-full h-14 text-lg cursor-pointer bg-my-blue hover:bg-my-blue-dark"
                      onClick={() => setShowLiquidateAllDialog(true)}
                      disabled={
                        actionInFlight || client.balance < totalReservedValue
                      }
                    >
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      Liquidar Cuenta ({reservedItems.length} productos)
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
                    Usa el botón &quot;Apartar Producto&quot; para agregar
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
              {movements.length > 0 ? (
                <div className="space-y-3 max-h-150 overflow-y-auto">
                  {movements.map((m) => (
                    <div
                      key={`${m.type}-${m.id}`}
                      className={`p-4 border-2 rounded-lg ${
                        m.type === "abono"
                          ? "bg-my-blue-light/20 border-my-blue-light"
                          : "bg-my-red-light/20 border-my-red-light"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-semibold text-lg">
                            {m.type === "abono"
                              ? `Abono (${m.method})`
                              : `Liquidación: ${m.items.map((i) => i.title).join(", ")}`}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {new Date(m.date).toLocaleDateString("es-MX", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-2xl font-bold ${
                              m.type === "abono"
                                ? "text-my-blue-dark"
                                : "text-my-red-dark"
                            }`}
                          >
                            {m.type === "abono" ? "+" : "-"}$
                            {Number(m.amount).toFixed(2)}
                          </p>
                          {m.type === "abono" ? (
                            <Badge className="mt-1 bg-my-blue text-white">Abono</Badge>
                          ) : (
                            <Badge className="mt-1 bg-my-red text-white">Pago</Badge>
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
        onAssign={(productId) => handleAssignProduct(productId)}
        client={client}
        availableProducts={availableProducts}
      />
      <AddPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onAddPayment={handleAddPayment}
      />

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
              <div className="p-4 bg-my-blue-light/20 rounded-lg border-2 border-my-blue-light">
                <p className="font-semibold text-my-blue-dark mb-2">
                  Se van a liquidar {reservedItems.length} productos:
                </p>
                <ul className="space-y-1 text-sm text-my-blue-dark">
                  {reservedItems.map((r) => (
                    <li key={r.itemId}>
                      • {r.title} - ${r.price.toFixed(2)}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-4 bg-my-yellow-light/30 rounded-lg border-2 border-my-yellow-light space-y-2">
                <div className="flex justify-between text-base">
                  <span>Total a pagar:</span>
                  <span className="font-bold text-my-yellow-dark">
                    ${totalReservedValue.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-base">
                  <span>Saldo actual:</span>
                  <span className="font-bold text-my-blue-dark">
                    ${client.balance.toFixed(2)}
                  </span>
                </div>
                <div className="h-px bg-my-yellow" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Sobrante:</span>
                  <span className="text-my-blue-dark">
                    ${remainingBalance.toFixed(2)}
                  </span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="cursor-pointer"
              disabled={actionInFlight}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLiquidateAll}
              disabled={actionInFlight}
              className="bg-my-blue hover:bg-my-blue-dark cursor-pointer"
            >
              Sí, liquidar todo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
