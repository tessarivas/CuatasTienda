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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { EditClientModal } from "../_components/edit-client-modal";
import { ReceiptDialog } from "../../sales/_components/receipt-dialog";
import { CardActionButton } from "../../suppliers/_components/card-action-button";
import {
  AddPaymentModal,
  type PaymentMethod,
} from "../_components/add-payment-modal";
import {
  ArrowLeft,
  FileDown,
  HandCoins,
  ReceiptText,
  Trash2,
  Pencil,
  X,
  Plus,
  ShoppingBag,
  Package,
  Clock,
  Receipt,
  Loader2,
  Paperclip,
} from "lucide-react";
import {
  normalizeClient,
  type ApiClient,
} from "@/lib/clients/normalize";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

type ActiveLayaway = {
  id: number;
  status: string;
  LayawayItem: Array<{
    id: number;
    productId: number;
    price: string | number;
    createdAt: string;
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
      receiptUrl: string | null;
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
  createdAt: string;
};

// Varias unidades del mismo producto se muestran como una sola tarjeta con
// contador, en vez de una tarjeta repetida por unidad.
// "1 oct": fecha corta para las tarjetas de apartados.
const shortDay = (iso: string) =>
  new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short" });

// Fecha de apartado de una tarjeta. Con varias unidades apartadas en días
// distintos se muestra la más antigua ("Desde") y el tooltip lista todas.
function reservedDateLabel(items: { createdAt: string }[]) {
  const days = items.map((i) => shortDay(i.createdAt));
  const sameDay = days.every((d) => d === days[0]);
  return {
    text: sameDay ? `Apartado el ${days[0]}` : `Desde el ${days[0]}`,
    title: sameDay ? undefined : `Apartados el ${days.join(", ")}`,
  };
}

type ReservedGroup = {
  productId: number;
  title: string;
  picture: string | null;
  items: ReservedItem[];
};

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { clients, setClients, products, setProducts, suppliers, isLoadingProducts } =
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
  // Diálogo de "Liquidar Cuenta" y el método con el que se pagaría lo que
  // falte (sólo se usa si el saldo no alcanza).
  const [isLiquidarOpen, setIsLiquidarOpen] = React.useState(false);
  const [liquidarMethod, setLiquidarMethod] =
    React.useState<PaymentMethod>("Efectivo");
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  // Abono cuyo comprobante se está viendo.
  const [viewingReceipt, setViewingReceipt] = React.useState<{
    url: string;
    title: string;
  } | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
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
        createdAt: item.createdAt,
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
  // donde cada anotación nueva se escribe abajo, junto a los totales. Los
  // renglones no llevan un resta corriente: confundía (cambia renglón por
  // renglón y las ventas `legacy` lo descuadran al principio). Las cuentas
  // viven sólo en el pie.
  const ledgerMovements = React.useMemo(
    () => [...movements].reverse(),
    [movements]
  );
  const ledgerScrollRef = React.useRef<HTMLDivElement>(null);
  // hasClient e isLoadingMovements en deps: la lista puede montarse después
  // de que llegan los movimientos (esperando al cliente o quitando el
  // loader), y también hay que bajarla al final en ese momento.
  const hasClient = !!client;
  React.useEffect(() => {
    const el = ledgerScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [ledgerMovements, hasClient, isLoadingMovements, isLoadingLayaway]);

  // Estado de cuenta en PDF: apartados vigentes, saldo y el cuaderno
  // completo, con las mismas etiquetas que la pantalla.
  const handleExport = async () => {
    if (!client || isExporting) return;
    setIsExporting(true);
    try {
      const { exportClientStatementPdf } = await import(
        "@/lib/pdf/client-statement-report"
      );
      await exportClientStatementPdf({
        clientName: client.name,
        phone: client.phone,
        reserved: reservedGroups.map((g) => ({
          title: g.title,
          units: g.items.length,
          total: g.items.reduce((sum, i) => sum + i.price, 0),
        })),
        reservedTotal: reservedItems.reduce((sum, r) => sum + r.price, 0),
        balance: client.balance,
        movements: ledgerMovements.map((m) => {
          const amount = Number(m.amount);
          if (m.type === "abono") {
            return { date: m.date, label: `Abono (${m.method})`, kind: "abono" as const, amount };
          }
          if (m.type === "apartado") {
            const cancelled = m.status === "Cancelado";
            return {
              date: m.date,
              label: `Apartó: ${m.title}${cancelled ? " (cancelado)" : ""}`,
              kind: cancelled ? ("nota" as const) : ("cargo" as const),
              amount,
            };
          }
          const titles = m.items.map((i) => i.title).join(", ");
          return {
            date: m.date,
            label: `${m.legacy ? "Liquidación" : "Vendido"}: ${titles}`,
            kind: m.legacy ? ("cargo" as const) : ("nota" as const),
            amount,
          };
        }),
      });
    } catch (err) {
      console.error("Exportar estado de cuenta falló", err);
      toast.error("No se pudo generar el reporte");
    } finally {
      setIsExporting(false);
    }
  };

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
        toast.error(message ?? "No se pudo registrar el abono");
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
      toast.success(`Abono de $${amount.toFixed(2)} registrado`);
    } catch {
      toast.error("No se pudo registrar el abono");
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
        toast.error(message ?? "No se pudo apartar el producto");
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
      // El apartado nuevo también es un renglón del historial ("Apartó: …").
      await Promise.all([reloadLayaway(), reloadMovements()]);
      setIsAssignModalOpen(false);
      toast.success("Producto apartado");
    } catch {
      toast.error("No se pudo apartar el producto");
    } finally {
      setActionInFlight(false);
    }
  };

  // `shortfallMethod`: para "Liquidar Cuenta" — el servidor abona lo que
  // falta con ese método y liquida, todo en una transacción. Devuelve si
  // salió bien, para que el diálogo sepa si cerrarse.
  const liquidateItems = async (
    itemIds: number[],
    shortfallMethod?: PaymentMethod
  ): Promise<boolean> => {
    if (actionInFlight || itemIds.length === 0) return false;
    setActionInFlight(true);
    try {
      const res = await fetch(`/api/clients/${id}/layaway/liquidate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          shortfallMethod
            ? { itemIds, payShortfall: { method: shortfallMethod } }
            : { itemIds }
        ),
      });
      if (!res.ok) {
        const { error: message, faltante } = await res.json();
        toast.error(
          faltante
            ? `${message} Faltan $${faltante} MXN.`
            : (message ?? "No se pudo liquidar")
        );
        return false;
      }
      const { client: updatedClient }: { client: ApiClient } = await res.json();
      setClients((prev) =>
        prev.map((c) =>
          c.id === id ? normalizeClient(updatedClient) : c
        )
      );
      // Cada item liquidado consume 1 unidad y 1 reserva de su producto —
      // contadas por producto, porque puede haber varias unidades del mismo.
      // Si el stock queda en 0 el backend flipea a "Vendido"; en otro caso
      // mantiene "Disponible".
      const unitsByProduct = new Map<string, number>();
      for (const r of reservedItems) {
        if (!itemIds.includes(r.itemId)) continue;
        const key = String(r.productId);
        unitsByProduct.set(key, (unitsByProduct.get(key) ?? 0) + 1);
      }
      setProducts((prev) =>
        prev.map((p) => {
          const units = unitsByProduct.get(p.id);
          if (!units) return p;
          const newQty = Math.max(0, p.quantity - units);
          const newReserved = Math.max(0, (p.reservedCount ?? 0) - units);
          return {
            ...p,
            quantity: newQty,
            reservedCount: newReserved,
            status: newQty === 0 ? ("Vendido" as const) : p.status,
          };
        })
      );
      await Promise.all([reloadLayaway(), reloadMovements()]);
      toast.success(
        itemIds.length === 1
          ? "Apartado liquidado"
          : `${itemIds.length} apartados liquidados`
      );
      return true;
    } catch {
      toast.error("No se pudo liquidar");
      return false;
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

  // Liquida TODOS los apartados del cliente. Si el saldo no alcanza, el
  // servidor registra un abono por lo que falta con el método elegido, en la
  // misma transacción (ver liquidate/route.ts).
  const handleLiquidarCuenta = async () => {
    const ok = await liquidateItems(
      reservedItems.map((r) => r.itemId),
      liquidarMethod
    );
    if (ok) {
      setSelectedProductIds([]);
      setIsLiquidarOpen(false);
    }
  };

  // Sólo se puede borrar un cliente sin historial: el historial (movements)
  // ya incluye apartados de cualquier estado, abonos y ventas — es la misma
  // regla que valida DELETE /api/clients/[id].
  const handleDeleteClient = async () => {
    if (actionInFlight) return;
    setActionInFlight(true);
    try {
      const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const { error: message } = await res.json();
        toast.error(message ?? "No se pudo eliminar el cliente");
        return;
      }
      setClients((prev) => prev.filter((c) => c.id !== id));
      toast.success("Cliente eliminado");
      router.push("/admin/dashboard/clients");
    } catch {
      toast.error("No se pudo eliminar el cliente");
    } finally {
      setActionInFlight(false);
    }
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
        toast.error(message ?? "No se pudo cancelar el apartado");
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
      toast.success("Apartado cancelado");
    } catch {
      toast.error("No se pudo cancelar el apartado");
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

  // Las tres preguntas del mostrador, cada una con su propio renglón para no
  // tener que interpretar un solo número: cuánto cuesta lo apartado, cuánto
  // efectivo dejó, y cuánto le falta (o le sobra). Liquidar no cambia la
  // diferencia: baja apartado y abonado por el mismo monto. En centavos.
  const reservedTotalCents = reservedItems.reduce(
    (sum, r) => sum + Math.round(r.price * 100),
    0
  );
  const balanceCents = Math.round(client.balance * 100);
  const faltaCents = Math.max(0, reservedTotalCents - balanceCents);
  const sobranCents = Math.max(0, balanceCents - reservedTotalCents);
  const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <>
      {/* lg:h-full + flex-col: en pantallas grandes el contenedor toma
          exactamente el alto disponible bajo el header (main ya tiene una
          altura real, no de contenido): las dos columnas se quedan con lo
          que sobra y scrollean por dentro, y la página nunca crece sin
          importar cuánto historial tenga el cliente. En celular la página
          crece normal y el historial scrollea dentro de un alto máximo
          (max-h-96). */}
      <div className="p-4 flex flex-col gap-4 lg:h-full">
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
          <div className="mt-4 md:mt-0 md:ml-auto flex flex-wrap items-center gap-2">
            {/* Editar abre el modal de datos del cliente; eliminar vive
                dentro de ese modal (mismo patrón que proveedores), para no
                tener un botón rojo en la pantalla principal. */}
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => setIsEditOpen(true)}
            >
              <Pencil />
              Editar
            </Button>
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => setIsAssignModalOpen(true)}
            >
              <ShoppingBag />
              {/* Texto corto en celular para que los tres botones quepan
                  en una fila. */}
              <span className="sm:hidden">Apartar</span>
              <span className="hidden sm:inline">Apartar Producto</span>
            </Button>
            <Button
              className="cursor-pointer"
              onClick={() => setIsPaymentModalOpen(true)}
            >
              <Plus />
              <span className="sm:hidden">Abonar</span>
              <span className="hidden sm:inline">Agregar Abono</span>
            </Button>
          </div>
        </div>

        {/* grid-cols-1 explícito: sin él, en celular la columna implícita
            mide lo que su texto más largo y la página se sale de lado.
            flex-1 min-h-0: toma el resto del alto disponible. min-h-0 es lo
            que realmente permite que los hijos con overflow-y-auto scrolleen
            en vez de que la tarjeta crezca — sin esto, un contenedor flex/grid
            nunca se encoge por debajo de la altura de su contenido. */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:flex-1 lg:min-h-0">
          {/* Productos Apartados: tarjetas visuales agrupadas por producto.
              Clic selecciona una (clic de nuevo deselecciona); los botones
              del pie actúan sobre la unidad más antigua de esa selección. */}
          <Card className="flex flex-col lg:h-full lg:min-h-0">
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
                            {(() => {
                              const date = reservedDateLabel(group.items);
                              return (
                                <p
                                  className="truncate text-xs opacity-75"
                                  title={date.title}
                                >
                                  {date.text}
                                </p>
                              );
                            })()}
                          </div>
                        </button>
                        </div>
                      );
                    })}
                  </div>
                  </div>

                  {/* "Liquidar Cuenta" no depende de la selección: liquida
                      todo, abonando lo que falte (con confirmación).
                      "Abono Completo" se habilita sólo si el saldo cubre la
                      suma de lo seleccionado. */}
                  <div className="shrink-0 flex flex-wrap justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      className="cursor-pointer"
                      disabled={actionInFlight}
                      onClick={() => {
                        setLiquidarMethod("Efectivo");
                        setIsLiquidarOpen(true);
                      }}
                    >
                      <ReceiptText />
                      Liquidar Cuenta
                    </Button>
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
          <Card className="flex flex-col lg:h-full lg:min-h-0">
            <CardHeader className="shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  <CardTitle className="text-lg whitespace-nowrap">
                    Historial de Movimientos
                  </CardTitle>
                </div>
                <CardActionButton
                  disabled={isLoadingMovements || isLoadingLayaway || isExporting}
                  onClick={handleExport}
                  title="Exportar estado de cuenta (PDF)"
                  aria-label="Exportar estado de cuenta"
                >
                  {isExporting ? <Loader2 className="animate-spin" /> : <FileDown />}
                  {/* En celular sólo el icono, para que el título quepa. */}
                  <span className="hidden sm:inline">
                    {isExporting ? "Generando PDF..." : "Exportar"}
                  </span>
                </CardActionButton>
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
                  className="flex-1 min-h-0 max-h-96 overflow-y-auto space-y-2 pr-1 lg:max-h-none"
                >
                  {ledgerMovements.map((m) => {
                    const isCancelled =
                      m.type === "apartado" && m.status === "Cancelado";
                    // Venta con apartado propio en la lista: sólo es la nota
                    // "se sacó de caja y se anotó vendido".
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
                          {/* Abono con tarjeta/transferencia con comprobante
                              adjunto (se adjunta desde el Corte de Caja). */}
                          {m.type === "abono" && m.receiptUrl && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Ver comprobante"
                              aria-label="Ver comprobante"
                              className="h-7 w-7 shrink-0 cursor-pointer text-muted-foreground"
                              onClick={() =>
                                setViewingReceipt({
                                  url: m.receiptUrl!,
                                  title: `Abono de ${client.name} · $${Number(m.amount).toFixed(2)}`,
                                })
                              }
                            >
                              <Paperclip />
                            </Button>
                          )}
                          <p
                            className={cn(
                              "shrink-0",
                              isQuietSale ? "text-sm" : "font-bold",
                              isCancelled && "line-through"
                            )}
                          >
                            ${Number(m.amount).toFixed(2)}
                          </p>
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

              {/* Resumen. Lo que depende de los apartados espera a que
                  carguen para no mostrar un monto equivocado; los loaders
                  ocupan el mismo alto que el número (h-5 / h-6), si no el pie
                  crece al terminar de cargar y deja cortado el último
                  renglón del historial, que ya se había bajado al final. */}
              <div className="shrink-0 mt-3 pt-3 border-t-2 space-y-1 text-sm">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Total apartado</span>
                  {isLoadingLayaway ? (
                    <span className="flex h-5 items-center">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </span>
                  ) : (
                    <span>{formatMoney(reservedTotalCents)}</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Abonado</span>
                  <span>{formatMoney(balanceCents)}</span>
                </div>
                <div className="flex items-center justify-between border-t pt-2 mt-2">
                  <span>Falta por pagar</span>
                  {isLoadingLayaway ? (
                    <span className="flex h-6 items-center">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </span>
                  ) : (
                    <span
                      className={cn(
                        "text-base font-bold",
                        faltaCents > 0 && "text-my-red-dark"
                      )}
                    >
                      {formatMoney(faltaCents)}
                    </span>
                  )}
                </div>
                {/* Caso raro: abonó más de lo que tiene apartado. */}
                {!isLoadingLayaway && sobranCents > 0 && (
                  <div className="flex items-center justify-between">
                    <span>Le sobran</span>
                    <span className="font-medium text-my-green-dark">
                      {formatMoney(sobranCents)}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modales */}
      <EditClientModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        client={client}
        onSaved={(updated) =>
          setClients((prev) =>
            prev.map((c) => (c.id === id ? normalizeClient(updated) : c))
          )
        }
        onDelete={() => {
          // Se cierra primero para no anidar el AlertDialog dentro del Dialog.
          setIsEditOpen(false);
          setIsDeleteOpen(true);
        }}
      />
      {/* Eliminar cliente: con historial sólo explica por qué no se puede;
          sin historial confirma con el botón destructivo, como los demás
          diálogos de borrar. */}
      <AlertDialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          if (!open && !actionInFlight) setIsDeleteOpen(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {movements.length > 0
                ? "Este cliente no se puede eliminar"
                : "¿Eliminar cliente?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {movements.length > 0 ? (
                <>
                  {client.name} tiene historial (abonos, apartados o ventas).
                  Ese historial forma parte de su cuenta y de los cortes de
                  los proveedores, así que no se borra.
                </>
              ) : (
                <>
                  Se eliminará a{" "}
                  <span className="font-medium text-foreground">
                    {client.name}
                  </span>{" "}
                  de forma permanente. Esta acción no se puede deshacer.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {movements.length > 0 ? (
              <AlertDialogCancel className="cursor-pointer">
                Entendido
              </AlertDialogCancel>
            ) : (
              <>
                <AlertDialogCancel
                  className="cursor-pointer"
                  disabled={actionInFlight}
                >
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  className="cursor-pointer bg-destructive text-white hover:bg-destructive/90"
                  disabled={actionInFlight}
                  onClick={(e) => {
                    e.preventDefault();
                    handleDeleteClient();
                  }}
                >
                  <Trash2 />
                  {actionInFlight ? "Eliminando..." : "Eliminar cliente"}
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmación de "Liquidar Cuenta": muestra las tres cuentas del pie
          y, si falta dinero, pide con qué método se cobra. */}
      <AlertDialog
        open={isLiquidarOpen}
        onOpenChange={(open) => {
          if (!open && !actionInFlight) setIsLiquidarOpen(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Liquidar toda la cuenta?</AlertDialogTitle>
            <AlertDialogDescription>
              Se marcarán como vendidos los {reservedItems.length}{" "}
              {reservedItems.length === 1
                ? "producto apartado"
                : "productos apartados"}{" "}
              de {client.name}.
              {faltaCents > 0
                ? ` Primero se registrará un abono por ${formatMoney(faltaCents)}, lo que falta por pagar.`
                : " El saldo abonado ya alcanza; no se cobra nada más."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-1 rounded-lg border p-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Total apartado</span>
              <span>{formatMoney(reservedTotalCents)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Abonado</span>
              <span>{formatMoney(balanceCents)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t pt-2">
              <span>{faltaCents > 0 ? "A cobrar ahora" : "Falta por pagar"}</span>
              <span
                className={cn(
                  "font-bold",
                  faltaCents > 0 && "text-my-red-dark"
                )}
              >
                {formatMoney(faltaCents)}
              </span>
            </div>
          </div>

          {faltaCents > 0 && (
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="text-right text-sm font-medium">Método</span>
              <Select
                value={liquidarMethod}
                onValueChange={(v) => setLiquidarMethod(v as PaymentMethod)}
              >
                <SelectTrigger className="col-span-3 w-full cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Efectivo">Efectivo</SelectItem>
                  <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="Transferencia">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

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
                // Abierto hasta que responda la API; handleLiquidarCuenta
                // lo cierra si salió bien.
                e.preventDefault();
                handleLiquidarCuenta();
              }}
            >
              {actionInFlight
                ? "Liquidando..."
                : faltaCents > 0
                  ? `Cobrar ${formatMoney(faltaCents)} y liquidar`
                  : "Liquidar Cuenta"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      <ReceiptDialog
        url={viewingReceipt?.url ?? null}
        title={viewingReceipt?.title ?? ""}
        onClose={() => setViewingReceipt(null)}
      />
      <AssignProductModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        onAssign={(productId) => handleAssignProduct(productId)}
        client={client}
        availableProducts={availableProducts}
        suppliers={suppliers}
        isLoading={isLoadingProducts}
      />
      <AddPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onAddPayment={handleAddPayment}
      />
    </>
  );
}
