"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  ChevronDown,
  FileDown,
  HandCoins,
  ListTodo,
  Loader2,
  Lock,
  LockOpen,
  Package,
  Paperclip,
  Store,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CardActionButton } from "../../suppliers/_components/card-action-button";
import { type DashboardData, type SupplierCutoffPending, dayLabel, money } from "./types";
import { toast } from "@/lib/toast";

type Tone = "yellow" | "green" | "purple" | "pink" | "orange" | "blue";

const TONES: Record<Tone, string> = {
  yellow: "bg-my-yellow-light text-my-yellow-dark",
  green: "bg-my-green-light text-my-green-dark",
  purple: "bg-my-purple-light text-my-purple-dark",
  pink: "bg-my-pink-light text-my-pink-dark",
  orange: "bg-my-orange-light text-my-orange-dark",
  blue: "bg-my-blue-light text-my-blue-dark",
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" });

// Palomita que se dibuja sola: lo que ya está al día.
function AnimatedCheck() {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-my-green-light text-my-green-dark">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={3}>
        <motion.path
          d="M5 12.5l4.5 4.5L19 7.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
        />
      </svg>
    </span>
  );
}

interface PendingItemProps {
  icon: React.ComponentType<{ className?: string }>;
  tone: Tone;
  title: string;
  subtitle: React.ReactNode;
  done?: boolean;
  count?: number;
  action?: React.ReactNode;
  // Con contenido, el renglón se despliega al darle clic.
  children?: React.ReactNode;
  defaultOpen?: boolean;
}

// Un pendiente: icono, título y resumen; se despliega para ver el detalle.
function PendingItem({
  icon: Icon,
  tone,
  title,
  subtitle,
  done,
  count,
  action,
  children,
  defaultOpen = false,
}: PendingItemProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const expandable = !!children && !done;

  const header = (
    <>
      {done ? (
        <AnimatedCheck />
      ) : (
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", TONES[tone])}>
          <Icon className="h-4 w-4" />
        </span>
      )}
      <div className="min-w-0 flex-1 text-left">
        <p className={cn("truncate text-sm font-medium", done && "text-muted-foreground")}>{title}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {!!count && <Badge variant="secondary">{count}</Badge>}
      {expandable && (
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      )}
    </>
  );

  return (
    <div className="border-b py-3 last:border-b-0">
      <div className="flex items-center gap-3">
        {expandable ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-3"
          >
            {header}
          </button>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-3">{header}</div>
        )}
        {action}
      </div>
      <AnimatePresence initial={false}>
        {expandable && open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="space-y-1 pt-3 pl-12">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailRow({ children, href }: { children: React.ReactNode; href?: string }) {
  const className = "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm";
  return href ? (
    <Link href={href} className={cn(className, "cursor-pointer hover:bg-muted")}>
      {children}
    </Link>
  ) : (
    <div className={className}>{children}</div>
  );
}

export function PendingCard({ pending }: { pending: DashboardData["pending"] }) {
  const [downloading, setDownloading] = React.useState<string | null>(null);
  const { closing, receipts, supplierCutoffs, coverable, lowStock } = pending;
  const readyCutoffs = supplierCutoffs.filter((c) => c.status === "listo").length;

  // Acciones que alguien tiene que hacer (para el contador del encabezado).
  const actionCount =
    (closing.status === "abierto" && closing.cobros > 0 ? 1 : 0) +
    receipts.length +
    readyCutoffs +
    coverable.length;

  // Corte del proveedor en PDF, directo desde aquí (mismo reporte que
  // "Exportar Reporte" en su Corte Mensual).
  const downloadCutoff = async (c: SupplierCutoffPending) => {
    const key = `${c.supplierId}-${c.from}`;
    if (downloading) return;
    setDownloading(key);
    try {
      const res = await fetch(`/api/suppliers/${c.supplierId}/cutoff?from=${c.from}&to=${c.to}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const { exportSupplierCutoffPdf } = await import("@/lib/pdf/supplier-cutoff-report");
      await exportSupplierCutoffPdf({ ...data, supplierName: c.name, isCurrentPeriod: true });
    } catch (err) {
      console.error("Descargar corte de proveedor falló", err);
      toast.error("No se pudo generar el reporte");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <Card className="h-full min-h-0 gap-2">
      <CardHeader className="shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            <CardTitle className="text-lg">Pendientes</CardTitle>
          </div>
          {actionCount > 0 && <Badge variant="secondary">{actionCount}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-y-auto">
        {/* Corte de caja de hoy */}
        {closing.status === "cerrado" ? (
          <PendingItem
            icon={Lock}
            tone="green"
            done
            title="Corte de hoy cerrado"
            subtitle={
              closing.lateCount > 0
                ? `${closing.lateCount} ${closing.lateCount === 1 ? "cobro después del cierre va" : "cobros después del cierre van"} al siguiente corte`
                : `Por ${closing.closedBy} a las ${formatTime(closing.closedAt)}`
            }
            action={
              <CardActionButton asChild>
                <Link href="/admin/dashboard/cash-closing">Ver</Link>
              </CardActionButton>
            }
          />
        ) : (
          <PendingItem
            icon={LockOpen}
            tone="yellow"
            done={closing.cobros === 0}
            title={closing.cobros === 0 ? "Sin cobros por cerrar" : "Corte de hoy abierto"}
            subtitle={
              closing.cobros === 0
                ? "El corte de hoy todavía no tiene cobros"
                : `${closing.cobros} ${closing.cobros === 1 ? "cobro" : "cobros"} sin cerrar`
            }
            action={
              closing.cobros > 0 && (
                <CardActionButton asChild>
                  <Link href="/admin/dashboard/cash-closing">Cerrar</Link>
                </CardActionButton>
              )
            }
          />
        )}

        {/* Comprobantes de tarjeta/transferencia sin adjuntar */}
        <PendingItem
          icon={Paperclip}
          tone="purple"
          done={receipts.length === 0}
          title={receipts.length === 0 ? "Comprobantes al día" : "Comprobantes por adjuntar"}
          subtitle={
            receipts.length === 0
              ? "Todos los cobros con tarjeta o transferencia tienen su comprobante"
              : "Cobros con tarjeta o transferencia sin imagen"
          }
          count={receipts.length}
        >
          {receipts.map((r) => (
            <DetailRow key={r.key}>
              <span className="min-w-0 flex-1 truncate">{r.label}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {new Date(r.date).toLocaleDateString("es-MX", { day: "numeric", month: "short" })} · {r.method}
              </span>
              <span className="w-24 shrink-0 text-right font-medium tabular-nums">{money(r.amount)}</span>
            </DetailRow>
          ))}
          <Link
            href="/admin/dashboard/cash-closing"
            className="inline-block px-2 pt-1 text-xs font-medium underline-offset-4 hover:underline"
          >
            Adjuntar en Corte de Caja
          </Link>
        </PendingItem>

        {/* Cortes de proveedor por entregar o próximos */}
        <PendingItem
          icon={Store}
          tone="pink"
          done={supplierCutoffs.length === 0}
          title={supplierCutoffs.length === 0 ? "Sin cortes de proveedor cerca" : "Cortes de proveedor"}
          subtitle={
            supplierCutoffs.length === 0
              ? "Ningún corte termina esta semana"
              : readyCutoffs > 0
                ? `${readyCutoffs} ${readyCutoffs === 1 ? "listo" : "listos"} para entregar`
                : `${supplierCutoffs.length} ${supplierCutoffs.length === 1 ? "termina" : "terminan"} esta semana`
          }
          count={supplierCutoffs.length}
          defaultOpen={readyCutoffs > 0}
        >
          {supplierCutoffs.map((c) => {
            const key = `${c.supplierId}-${c.from}`;
            return (
              <div key={key} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm">
                <Link
                  href={`/admin/dashboard/suppliers/${c.supplierId}`}
                  className="min-w-0 flex-1 cursor-pointer hover:underline"
                >
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.status === "listo"
                      ? `Terminó el ${dayLabel(c.to)}. Listo para entregar`
                      : c.days === 0
                        ? `Termina hoy (${dayLabel(c.from)} al ${dayLabel(c.to)})`
                        : `Termina el ${dayLabel(c.to)}, en ${c.days} ${c.days === 1 ? "día" : "días"}`}
                  </p>
                </Link>
                <CardActionButton
                  disabled={!!downloading}
                  onClick={() => downloadCutoff(c)}
                  title={`Corte del ${dayLabel(c.from)} al ${dayLabel(c.to)}`}
                >
                  {downloading === key ? <Loader2 className="animate-spin" /> : <FileDown />}
                  PDF
                </CardActionButton>
              </div>
            );
          })}
        </PendingItem>

        {/* Clientes cuyo saldo ya alcanza para liquidar un apartado */}
        {coverable.length > 0 && (
          <PendingItem
            icon={HandCoins}
            tone="green"
            title="Pueden liquidar"
            subtitle="Su saldo ya cubre al menos un apartado"
            count={coverable.length}
          >
            {coverable.map((c) => (
              <DetailRow key={c.clientId} href={`/admin/dashboard/clients/${c.clientId}`}>
                <span className="min-w-0 flex-1 truncate">{c.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {c.items} {c.items === 1 ? "apartado" : "apartados"}
                </span>
                <span className="w-24 shrink-0 text-right font-medium tabular-nums">{money(c.balance)}</span>
              </DetailRow>
            ))}
          </PendingItem>
        )}

        {/* Productos con una sola unidad libre */}
        {lowStock.length > 0 && (
          <PendingItem
            icon={Package}
            tone="orange"
            title="Por agotarse"
            subtitle="Productos con una sola pieza libre"
            count={lowStock.length}
          >
            {lowStock.map((p) => (
              <DetailRow key={p.productId}>
                <span className="min-w-0 flex-1 truncate">{p.title}</span>
                <span className="shrink-0 truncate text-xs text-muted-foreground">{p.supplier}</span>
              </DetailRow>
            ))}
          </PendingItem>
        )}
      </CardContent>
    </Card>
  );
}
