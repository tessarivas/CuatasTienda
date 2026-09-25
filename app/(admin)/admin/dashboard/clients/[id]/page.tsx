"use client";

import * as React from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { DashboardContext } from "../../layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { AssignProductModal } from "../_components/assign-product-modal";
import {
  AddPaymentModal,
  type PaymentMethod,
} from "../_components/add-payment-modal";
import {
  ArrowLeft,
  HandCoins,
  X,
  Plus,
  ShoppingBag,
  Package,
  Clock,
  Receipt,
  Loader2,
} from "lucide-react";
import {
  normalizeClient,
  type ApiClient,
} from "@/lib/clients/normalize";
import { cn } from "@/lib/utils";

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
      type: "apartado";
      id: number;
      date: string;
      amount: string;
      title: string;
      status: "Activo" | "Liquidado" | "Cancelado";
    }
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
      legacy: boolean;
    };

// Una fila por unidad apartada (LayawayItem). Ordenadas por itemId asc para
// que el primer elemento de cada grupo sea siempre la unidad más antigua —
// la que se liquida primero (FIFO).
type ReservedItem = {
  itemId: number;
  productId: number;
  title: string;
  price: number;
  picture: string | null;
};

// Varias unidades del mismo producto se muestran como una sola tarjeta con
// contador, en vez de una tarjeta repetida por unidad.
type ReservedGroup = {
  productId: number;
  title: string;
  picture: string | null;
  items: ReservedItem[];
};

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { clients, setClients, products, setProducts, suppliers } =
    React.useContext(DashboardContext);

  const [layaway, setLayaway] = React.useState<ActiveLayaway>(null);
  const [movements, setMovements] = React.useState<Movement[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = React.useState(true);
  // Un flag por tarjeta: cada una deja su loader en cuanto llega su propio
  // dato, sin esperar a la otra. Sólo cubre la carga inicial; las recargas
  // después de abonar/liquidar mantienen el contenido anterior en pantalla.
  const [isLoadingLayaway, setIsLoadingLayaway] = React.useState(true);
  const [isLoadingMovements, setIsLoadingMovements] = React.useState(true);

  const [isAssignModalOpen, setIsAssignModalOpen] = React.useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false);
  const [actionInFlight, setActionInFlight] = React.useState(false);
  // Varios productos seleccionables a la vez; clic de nuevo sobre una
  // tarjeta la deselecciona.
  const [selectedProductIds, setSelectedProductIds] = React.useState<
    number[]
  >([]);
  // Grupo cuyo apartado se va a cancelar; abre el diálogo de confirmación.
  const [cancelTarget, setCancelTarget] = React.useState<ReservedGroup | null>(
    null
  );

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
      await Promise.all([
        reloadClient(),
        reloadLayaway().finally(() => setIsLoadingLayaway(false)),
        reloadMovements().finally(() => setIsLoadingMovements(false)),
      ]);
      setIsLoadingDetail(false);
    })();
  }, [reloadClient, reloadLayaway, reloadMovements]);

  const reservedItems = React.useMemo<ReservedItem[]>(() => {
    const items = layaway?.LayawayItem ?? [];
    return items
      .map((item) => ({
        itemId: item.id,
        productId: item.productId,
        title: item.Product.title,
        price: Number(item.price),
        picture: item.Product.picture,
      }))
      .sort((a, b) => a.itemId - b.itemId);
  }, [layaway]);

  const reservedGroups = React.useMemo<ReservedGroup[]>(() => {
    const byProduct = new Map<number, ReservedGroup>();
    for (const item of reservedItems) {
      const existing = byProduct.get(item.productId);
      if (existing) {
        existing.items.push(item);
      } else {
        byProduct.set(item.productId, {
          productId: item.productId,
          title: item.title,
          picture: item.picture,
          items: [item],
        });
      }
    }
    return Array.from(byProduct.values());
  }, [reservedItems]);

  // Por cada producto seleccionado se liquida su unidad más antigua.
  const selectedTargets = reservedGroups
    .filter((g) => selectedProductIds.includes(g.productId))
    .map((g) => g.items[0]);
  // En centavos para no comparar sumas de flotantes contra el saldo.
  const selectedTotalCents = selectedTargets.reduce(
    (sum, t) => sum + Math.round(t.price * 100),
    0
  );
  const remainingBalanceCents = client
    ? Math.round(client.balance * 100) - selectedTotalCents
    : 0;

  // El API entrega lo más nuevo primero; aquí va al revés, como un cuaderno
  // donde cada anotación nueva se escribe abajo, junto al saldo. Cada renglón
  // lleva el RESTA corriente de la lista en papel: apartar suma, abonar
  // resta, cancelar no cuenta (queda tachado) y liquidar no lo mueve — salvo
  // las liquidaciones `legacy`, cuyo renglón de apartado ya no existe y por
  // eso cuentan como apartado y venta a la vez. Así el último RESTA coincide
  // con el del pie (apartados activos − saldo). En centavos.
  const ledgerMovements = React.useMemo(() => {
    let restaCents = 0;
    return [...movements].reverse().map((m) => {
      const cents = Math.round(Number(m.amount) * 100);
      let delta: number | null = null;
      if (m.type === "apartado" && m.status !== "Cancelado") delta = cents;
      if (m.type === "abono") delta = -cents;
      if (m.type === "liquidacion" && m.legacy) delta = cents;
      if (delta !== null) restaCents += delta;
      return { movement: m, restaCents: delta !== null ? restaCents : null };
    });
  }, [movements]);
  const ledgerScrollRef = React.useRef<HTMLDivElement>(null);
  // hasClient e isLoadingMovements en deps: la lista puede montarse después
  // de que llegan los movimientos (esperando al cliente o quitando el
  // loader), y también hay que bajarla al final en ese momento.
  const hasClient = !!client;
  React.useEffect(() => {
    const el = ledgerScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [ledgerMovements, hasClient, isLoadingMovements, isLoadingLayaway]);

  const canLiquidateSelection =
    selectedTargets.length > 0 &&
    !!client &&
    selectedTotalCents <= Math.round(client.balance * 100);

  const availableProducts = React.useMemo(
    () =>
      products.filter(
        (p) =>
          p.status === "Disponible" &&
          p.quantity - (p.reservedCount ?? 0) > 0
      ),
    [products]
  );

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
    } catch {
      alert("No se pudo liquidar");
    } finally {
      setActionInFlight(false);
    }
  };

  // Liquida con el saldo disponible la unidad más antigua de cada producto
  // seleccionado. No abona nada: si el saldo no alcanza, el botón ya está
  // deshabilitado y el cliente debe abonar primero con "Agregar Abono".
  const handleAbonoCompleto = async () => {
    if (!canLiquidateSelection) return;
    await liquidateItems(selectedTargets.map((t) => t.itemId));
    setSelectedProductIds([]);
  };

  // Cancela la unidad apartada más reciente del grupo (la última en entrar);
  // la liquidación toma la más antigua. El item queda "Cancelado" en el
  // historial (tachado) y la unidad vuelve a estar disponible sola. El saldo
  // no se toca: lo abonado sigue siendo del cliente.
  const handleCancelApartado = async () => {
    if (!cancelTarget || actionInFlight) return;
    const target = cancelTarget.items[cancelTarget.items.length - 1];
    setActionInFlight(true);
    try {
      const res = await fetch(
        `/api/clients/${id}/layaway/items/${target.itemId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const { error: message } = await res.json();
        alert(message ?? "No se pudo cancelar el apartado");
        return;
      }
      setProducts((prev) =>
        prev.map((p) =>
          p.id === String(target.productId)
            ? { ...p, reservedCount: Math.max(0, (p.reservedCount ?? 0) - 1) }
            : p
        )
      );
      // Si era la última unidad del grupo, la tarjeta desaparece; quitarla
      // de la selección evita que quede un id colgado.
      if (cancelTarget.items.length === 1) {
        setSelectedProductIds((prev) =>
          prev.filter((pid) => pid !== cancelTarget.productId)
        );
      }
      await Promise.all([reloadLayaway(), reloadMovements()]);
      setCancelTarget(null);
    } catch {
      alert("No se pudo cancelar el apartado");
    } finally {
      setActionInFlight(false);
    }
  };

  // --- Render ---

  if (!client && !isLoadingDetail) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center space-y-4">
          <p className="text-lg font-semibold">Cliente no encontrado</p>
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="cursor-pointer"
          >
            <ArrowLeft />
            Volver
          </Button>
        </div>
      </div>
    );
  }

  if (!client) {
    // Mismo loader que suppliers/[id].
    return (
      <div className="flex flex-1 items-center justify-center p-8 h-full">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando cliente...</p>
        </div>
      </div>
    );
  }

  // El RESTA de la lista en papel: lo apartado suma, lo abonado resta.
  // Liquidar no lo mueve (baja apartados y saldo por el mismo monto). En
  // centavos para no arrastrar errores de flotante.
  const reservedTotalCents = reservedItems.reduce(
    (sum, r) => sum + Math.round(r.price * 100),
    0
  );
  const restaCents = reservedTotalCents - Math.round(client.balance * 100);
  // Lo que muestra el pie. Mientras haya algo apartado sin marcar vendido,
  // siempre se ve un "Resta": si el saldo no alcanza, lo que falta; si ya
  // alcanza, lo que cuestan los apartados pendientes (siguen sin venderse).
  // "Saldo a favor" / "Sin adeudos" sólo aparecen sin apartados.
  const hasPendingApartados = reservedItems.length > 0;
  const footerCents = hasPendingApartados
    ? restaCents > 0
      ? restaCents
      : reservedTotalCents
    : Math.abs(restaCents);
  const footerLabel = hasPendingApartados
    ? "Resta"
    : restaCents < 0
      ? "Saldo a favor"
      : "Sin adeudos";

  return (
    <>
      {/* h-full + flex-col: el contenedor toma exactamente el alto
          disponible bajo el header (main ya tiene una altura real, no de
          contenido). Las dos columnas de abajo se quedan con lo que sobra y
          scrollean por dentro — la página en sí nunca crece ni hace scroll,
          sin importar cuánto historial tenga el cliente. */}
      <div className="p-4 flex flex-col gap-4 h-full">
        {/* Encabezado: mismo tratamiento que suppliers/[id]/inventory — las
            dos acciones principales viven aquí, compactas, no en una
            tarjeta grande de saldo (esa tarjeta se elimina; el saldo ahora
            vive sólo en el pie de Historial de Movimientos). */}
        <div className="shrink-0 flex flex-col md:flex-row md:items-center md:gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{client.name}</h1>
              <p className="text-sm text-muted-foreground">
                Cuenta del cliente
              </p>
            </div>
          </div>
          <div className="mt-4 md:mt-0 md:ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => setIsAssignModalOpen(true)}
            >
              <ShoppingBag />
              Apartar Producto
            </Button>
            <Button
              className="cursor-pointer"
              onClick={() => setIsPaymentModalOpen(true)}
            >
              <Plus />
              Agregar Abono
            </Button>
          </div>
        </div>

        {/* flex-1 min-h-0: toma el resto del alto disponible. min-h-0 es lo
            que realmente permite que los hijos con overflow-y-auto scrolleen
            en vez de que la tarjeta crezca — sin esto, un contenedor flex/grid
            nunca se encoge por debajo de la altura de su contenido. */}
        <div className="grid lg:grid-cols-2 gap-6 flex-1 min-h-0">
          {/* Productos Apartados: tarjetas visuales agrupadas por producto.
              Clic selecciona una (clic de nuevo deselecciona); los botones
              del pie actúan sobre la unidad más antigua de esa selección. */}
          <Card className="flex flex-col h-full min-h-0">
            <CardHeader className="shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <CardTitle className="text-lg">
                    Productos Apartados
                  </CardTitle>
                </div>
                {!isLoadingLayaway && (
                  <Badge variant="secondary">{reservedItems.length}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 flex flex-col">
              {isLoadingLayaway ? (
                <div className="flex flex-1 items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">
                      Cargando apartados...
                    </p>
                  </div>
                </div>
              ) : reservedGroups.length > 0 ? (
                <div className="flex-1 min-h-0 flex flex-col gap-4">
                  {/* Sólo esta grilla scrollea; los botones de abajo quedan
                      siempre visibles, sin importar cuántos apartados haya. */}
                  <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {reservedGroups.map((group) => {
                      const isSelected = selectedProductIds.includes(
                        group.productId
                      );
                      // Verde = el saldo lo cubre. Lo que no cabe en lo que
                      // queda después de lo ya seleccionado no se puede
                      // seleccionar, así que la selección nunca excede el
                      // saldo; lo seleccionado siempre se puede quitar.
                      const isCovered =
                        isSelected ||
                        Math.round(group.items[0].price * 100) <=
                          remainingBalanceCents;
                      return (
                        // Wrapper en vez de meter el botón de cancelar dentro
                        // de la tarjeta: un <button> dentro de otro no es HTML
                        // válido, y la tarjeta deshabilitada (no alcanza el
                        // saldo) igual debe poder cancelarse.
                        <div key={group.productId} className="group relative">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          title="Cancelar apartado"
                          aria-label={`Cancelar apartado de ${group.title}`}
                          // Sólo al pasar el mouse por la tarjeta;
                          // focus-visible la muestra también al navegar con
                          // teclado (Tab), si no quedaría invisible.
                          className="absolute top-2 left-2 z-10 h-6 w-6 cursor-pointer rounded-full bg-background/90 shadow-sm opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                          onClick={() => setCancelTarget(group)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                        <button
                          type="button"
                          disabled={!isCovered}
                          onClick={() =>
                            setSelectedProductIds((prev) =>
                              prev.includes(group.productId)
                                ? prev.filter((pid) => pid !== group.productId)
                                : [...prev, group.productId]
                            )
                          }
                          className={cn(
                            "relative flex w-full flex-col gap-2 rounded-lg border p-3 text-left transition-colors",
                            isCovered
                              ? "cursor-pointer border-my-green-light bg-my-green-light/40 text-my-green-dark hover:border-my-green-dark/50"
                              : "cursor-not-allowed opacity-60",
                            isSelected &&
                              "border-my-green-dark hover:border-my-green-dark"
                          )}
                        >
                          {group.items.length > 1 && (
                            <span className="absolute top-2 right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-xs font-semibold text-background">
                              {group.items.length}
                            </span>
                          )}
                          <div className="aspect-square w-full overflow-hidden rounded-md border bg-muted flex items-center justify-center">
                            {group.picture ? (
                              <Image
                                src={group.picture}
                                alt={group.title}
                                width={96}
                                height={96}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Package className="h-8 w-8 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {group.title}
                            </p>
                            <p
                              className={cn(
                                "text-sm font-semibold",
                                !isCovered && "text-primary"
                              )}
                            >
                              ${group.items[0].price.toFixed(2)}
                            </p>
                          </div>
                        </button>
                        </div>
                      );
                    })}
                  </div>
                  </div>

                  {/* Se habilita sólo si el saldo cubre la suma de todo lo
                      seleccionado. */}
                  <div className="shrink-0 flex justify-end gap-2 pt-2">
                    <Button
                      className="cursor-pointer"
                      disabled={!canLiquidateSelection || actionInFlight}
                      onClick={handleAbonoCompleto}
                    >
                      <HandCoins />
                      Abono Completo
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-muted p-6 mb-4">
                    <Clock className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-medium mb-2">
                    No hay productos apartados
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Usa el botón &quot;Apartar Producto&quot; para agregar
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Historial de Movimientos: el saldo del cliente vive únicamente
              en el resumen del pie, no en una tarjeta destacada aparte. */}
          <Card className="flex flex-col h-full min-h-0">
            <CardHeader className="shrink-0">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                <CardTitle className="text-lg">
                  Historial de Movimientos
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 flex flex-col">
              {isLoadingMovements ? (
                <div className="flex flex-1 items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">
                      Cargando movimientos...
                    </p>
                  </div>
                </div>
              ) : movements.length > 0 ? (
                <div
                  ref={ledgerScrollRef}
                  className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1"
                >
                  {ledgerMovements.map(({ movement: m, restaCents: rowResta }) => {
                    const isCancelled =
                      m.type === "apartado" && m.status === "Cancelado";
                    // Venta con apartado propio en la lista: sólo es la nota
                    // "se sacó de caja y se anotó vendido"; no mueve el resta.
                    const isQuietSale = m.type === "liquidacion" && !m.legacy;
                    const label =
                      m.type === "apartado"
                        ? `Apartó: ${m.title}`
                        : m.type === "abono"
                          ? `Abono (${m.method})`
                          : `${m.legacy ? "Liquidación" : "Vendido"}: ${m.items
                              .map((i) => i.title)
                              .join(", ")}`;
                    return (
                      <div
                        key={`${m.type}-${m.id}`}
                        className={cn(
                          "py-2",
                          m.type === "abono" && "text-my-green-dark",
                          (m.type === "apartado" ||
                            (m.type === "liquidacion" && m.legacy)) &&
                            "text-my-red-dark",
                          (isCancelled || isQuietSale) &&
                            "text-muted-foreground"
                        )}
                      >
                        <div className="flex justify-between items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p
                              className={cn(
                                "text-sm font-medium truncate",
                                isCancelled && "line-through"
                              )}
                            >
                              {label}
                            </p>
                            <p className="text-xs opacity-75 mt-0.5">
                              {new Date(m.date).toLocaleDateString("es-MX", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                              {isCancelled && " · cancelado"}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p
                              className={cn(
                                isQuietSale ? "text-sm" : "font-bold",
                                isCancelled && "line-through"
                              )}
                            >
                              ${Number(m.amount).toFixed(2)}
                            </p>
                            {rowResta !== null && (
                              <p className="text-xs text-muted-foreground">
                                {rowResta > 0 ? "Resta" : rowResta < 0 ? "A favor" : "Resta"}{" "}
                                ${(Math.abs(rowResta) / 100).toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-muted p-6 mb-4">
                    <Receipt className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-medium">
                    No hay movimientos registrados
                  </p>
                </div>
              )}

              {/* Resumen: el saldo que el cliente ya dejó (dinero que la
                  tienda tiene guardado a su nombre) y el último RESTA de la
                  lista en papel. El RESTA depende de los apartados, así que
                  espera a que carguen para no mostrar un monto equivocado. */}
              <div className="shrink-0 mt-3 pt-3 border-t-2 space-y-1">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Saldo actual</span>
                <span>${client.balance.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  {isLoadingLayaway ? "Resta" : footerLabel}
                </span>
                {isLoadingLayaway ? (
                  // h-6 = alto del monto en negritas; sin esto el pie crece
                  // al terminar de cargar y deja cortado el último renglón
                  // del historial, que ya se había bajado al final.
                  <span className="flex h-6 items-center">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </span>
                ) : (
                  <span
                    className={cn(
                      "font-bold",
                      hasPendingApartados && "text-my-red-dark"
                    )}
                  >
                    ${(footerCents / 100).toFixed(2)}
                  </span>
                )}
              </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modales */}
      {/* Misma estructura que los diálogos de borrar, pero con el botón
          normal (no rojo): cancelar un apartado es reversible — se puede
          volver a apartar — y no toca dinero. */}
      <AlertDialog
        open={cancelTarget !== null}
        onOpenChange={(open) => {
          if (!open && !actionInFlight) setCancelTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar apartado?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelTarget && (
                <>
                  <span className="font-medium text-foreground">
                    {cancelTarget.title}
                  </span>{" "}
                  ($
                  {cancelTarget.items[
                    cancelTarget.items.length - 1
                  ].price.toFixed(2)}
                  ) dejará de estar apartado para {client.name}
                  {cancelTarget.items.length > 1 &&
                    ` (se cancela 1 de ${cancelTarget.items.length} unidades)`}
                  . La unidad vuelve a estar disponible en inventario, la
                  deuda baja y el producto queda tachado en el historial. El saldo del
                  cliente no cambia.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="cursor-pointer"
              disabled={actionInFlight}
            >
              Volver
            </AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer"
              disabled={actionInFlight}
              onClick={(e) => {
                // Mantener el diálogo abierto hasta que responda la API;
                // handleCancelApartado lo cierra al terminar bien.
                e.preventDefault();
                handleCancelApartado();
              }}
            >
              {actionInFlight ? "Cancelando..." : "Cancelar apartado"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AssignProductModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        onAssign={(productId) => handleAssignProduct(productId)}
        client={client}
        availableProducts={availableProducts}
        suppliers={suppliers}
      />
      <AddPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onAddPayment={handleAddPayment}
      />
    </>
  );
}
