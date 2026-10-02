"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  History,
  Landmark,
  Loader2,
  Lock,
  Paperclip,
  Save,
  Wallet,
} from "lucide-react";
import { StatCard } from "../_components/stat-card";
import { cn } from "@/lib/utils";
import { useTodayLabel } from "@/hooks/use-today-label";
import { ReceiptDialog } from "../sales/_components/receipt-dialog";
import { formatMoney } from "../sales/sales-utils";
import { ClosingHistoryDialog } from "./_components/closing-history-dialog";

type Method = "Efectivo" | "Tarjeta" | "Transferencia";

// Forma de GET /api/cash-closing. Decimal llega como string.
type DayData = {
  date: string;
  isToday: boolean;
  // Inicio de la ventana de cobros (cierre anterior o inicio del día) y fin
  // (hora del cierre; null en el corte abierto). null/null = día pasado sin
  // corte: sus cobros quedaron en el siguiente corte.
  periodStart: string | null;
  periodEnd: string | null;
  // Cobros hechos después de este cierre: entran al corte siguiente.
  lateCount: number;
  sales: {
    id: number;
    folio: string | null;
    date: string;
    total: string;
    paymentMethod: Method;
    receiptUrl: string | null;
  }[];
  payments: {
    id: number;
    date: string;
    amount: string;
    method: Method;
    receiptUrl: string | null;
    Client: { id: number; name: string };
  }[];
  summary: { cashSales: string; cashPayments: string; bankTotal: string };
  closing: {
    openingCash: string;
    countedCash: string;
    difference: string;
    notes: string | null;
    closedAt: string;
    updatedAt: string;
    User: { name: string };
  } | null;
};

// Un cobro con tarjeta o transferencia: venta de caja o abono de cliente.
type BankCharge = {
  key: string;
  kind: "venta" | "abono";
  id: number;
  label: string;
  method: Method;
  amount: number;
  receiptUrl: string | null;
};

const DEFAULT_OPENING_CASH = "200";
const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;

const toDateInput = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });

export default function CashClosingPage() {
  const todayLabel = useTodayLabel();
  // Fecha del corte en la hora local (la de la tienda). Se fija al montar:
  // en el servidor (UTC) "hoy" puede ser otro día.
  const [today, setToday] = React.useState("");
  const [date, setDate] = React.useState("");
  React.useEffect(() => {
    const value = toDateInput(new Date());
    setToday(value);
    setDate(value);
  }, []);

  const [data, setData] = React.useState<DayData | null>(null);
  const [openingCash, setOpeningCash] = React.useState(DEFAULT_OPENING_CASH);
  const [countedCash, setCountedCash] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [uploadingKey, setUploadingKey] = React.useState<string | null>(null);
  const [viewing, setViewing] = React.useState<BankCharge | null>(null);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const uploadTarget = React.useRef<BankCharge | null>(null);

  const loadDay = React.useCallback(async (day: string) => {
    setData(null);
    try {
      const res = await fetch(`/api/cash-closing?date=${day}`);
      if (!res.ok) throw new Error();
      const json: DayData = await res.json();
      setData(json);
      // Con corte guardado se muestran sus valores (para corregir); si no,
      // fondo de $200 y contado vacío.
      setOpeningCash(json.closing ? String(Number(json.closing.openingCash)) : DEFAULT_OPENING_CASH);
      setCountedCash(json.closing ? String(Number(json.closing.countedCash)) : "");
      setNotes(json.closing?.notes ?? "");
    } catch {
      alert("No se pudo cargar el corte de caja");
    }
  }, []);

  React.useEffect(() => {
    if (date) loadDay(date);
  }, [date, loadDay]);

  const isLoading = data === null;
  const cashSales = Number(data?.summary.cashSales ?? 0);
  const cashPayments = Number(data?.summary.cashPayments ?? 0);
  const bankTotal = Number(data?.summary.bankTotal ?? 0);
  const openingValid = MONEY_PATTERN.test(openingCash.trim());
  const countedValid = MONEY_PATTERN.test(countedCash.trim());
  // Caja principal: fondo + ventas en efectivo. Los abonos en efectivo van
  // a la caja de apartados, aparte, y no se cuentan aquí.
  const expectedCash = (openingValid ? Number(openingCash) : 0) + cashSales;
  const difference = countedValid ? Number(countedCash) - expectedCash : null;

  const bankCharges: BankCharge[] = data
    ? [
        ...data.sales
          .filter((s) => s.paymentMethod !== "Efectivo")
          .map((s) => ({
            key: `venta-${s.id}`,
            kind: "venta" as const,
            id: s.id,
            label: `Venta ${s.folio ?? `#${s.id}`}`,
            method: s.paymentMethod,
            amount: Number(s.total),
            receiptUrl: s.receiptUrl,
          })),
        ...data.payments
          .filter((p) => p.method !== "Efectivo")
          .map((p) => ({
            key: `abono-${p.id}`,
            kind: "abono" as const,
            id: p.id,
            label: `Abono de ${p.Client.name}`,
            method: p.method,
            amount: Number(p.amount),
            receiptUrl: p.receiptUrl,
          })),
      ]
    : [];
  const pendingReceipts = bankCharges.filter((c) => !c.receiptUrl).length;

  const handleSave = async () => {
    if (!openingValid || !countedValid || isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/cash-closing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, openingCash, countedCash, notes }),
      });
      if (!res.ok) {
        const { error: message } = await res.json();
        alert(message ?? "No se pudo guardar el corte");
        return;
      }
      await loadDay(date);
    } catch {
      alert("No se pudo guardar el corte");
    } finally {
      setIsSaving(false);
    }
  };

  const startUpload = (charge: BankCharge) => {
    uploadTarget.current = charge;
    fileInputRef.current?.click();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo
    const charge = uploadTarget.current;
    if (!file || !charge) return;
    if (!file.type.startsWith("image/")) {
      alert("El comprobante debe ser una imagen");
      return;
    }
    setUploadingKey(charge.key);
    try {
      const form = new FormData();
      form.append("file", file);
      const url =
        charge.kind === "venta"
          ? `/api/sales/${charge.id}/receipt`
          : `/api/payments/${charge.id}/receipt`;
      const res = await fetch(url, { method: "POST", body: form });
      if (!res.ok) {
        const { error: message } = await res.json();
        alert(message ?? "No se pudo subir el comprobante");
        return;
      }
      const { receiptUrl }: { receiptUrl: string } = await res.json();
      setData((prev) =>
        prev && {
          ...prev,
          sales: prev.sales.map((s) =>
            charge.kind === "venta" && s.id === charge.id ? { ...s, receiptUrl } : s
          ),
          payments: prev.payments.map((p) =>
            charge.kind === "abono" && p.id === charge.id ? { ...p, receiptUrl } : p
          ),
        }
      );
    } catch {
      alert("No se pudo subir el comprobante");
    } finally {
      setUploadingKey(null);
    }
  };

  const isToday = date === today;
  const closing = data?.closing ?? null;
  // Día pasado que nunca se cerró: no hay nada que mostrar ni guardar.
  const noClosing = !!data && !closing && !data.isToday;
  const wasCorrected =
    closing && new Date(closing.updatedAt).getTime() - new Date(closing.closedAt).getTime() > 1000;

  return (
    <>
      <div className="p-4 space-y-4">
        {/* Mismo layout que las páginas de lista; la fecha del día junto al
            título, como en inventario. */}
        <div className="flex flex-col md:flex-row md:items-center md:gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              Corte de Caja {isToday ? `Hoy ${todayLabel}` : date.split("-").reverse().join("/")}
            </h1>
            {/* Leyendas en gris: quién cerró, desde cuándo cuenta el corte
                abierto y si hubo cobros después del cierre. */}
            {closing ? (
              <p className="text-sm text-muted-foreground">
                Cerrado por {closing.User.name} · {formatTime(closing.closedAt)}
                {wasCorrected && ` · corregido ${formatTime(closing.updatedAt)}`}
              </p>
            ) : data?.periodStart ? (
              <p className="text-sm text-muted-foreground">
                Cobros desde {formatTime(data.periodStart)}
              </p>
            ) : null}
            {closing && data && data.lateCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {data.lateCount}{" "}
                {data.lateCount === 1
                  ? "cobro después del cierre entra al siguiente corte."
                  : "cobros después del cierre entran al siguiente corte."}
              </p>
            )}
          </div>
          <div className="mt-4 md:mt-0 md:ml-auto flex items-center gap-2">
            {!isToday && today && (
              <Button
                variant="outline"
                className="cursor-pointer"
                onClick={() => setDate(today)}
              >
                <ArrowLeft />
                Volver a hoy
              </Button>
            )}
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => setHistoryOpen(true)}
            >
              <History />
              Cortes anteriores
            </Button>
            <Button
              className="cursor-pointer"
              disabled={isLoading || isSaving || noClosing || !openingValid || !countedValid}
              onClick={handleSave}
              title={!countedValid ? "Escribe el efectivo contado" : undefined}
            >
              {closing ? <Save /> : <Lock />}
              {isSaving ? "Guardando..." : closing ? "Guardar corrección" : "Cerrar corte"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            color="yellow"
            icon={Wallet}
            title="Total cobrado"
            value={formatMoney(cashSales + cashPayments + bankTotal)}
            hint="Ventas de caja + abonos"
            loading={isLoading}
          />
          <StatCard
            color="blue"
            icon={Banknote}
            title="Efectivo esperado"
            value={formatMoney(expectedCash)}
            hint="Caja principal, con el fondo inicial"
            loading={isLoading}
          />
          <StatCard
            color="pink"
            icon={Landmark}
            title="Banco"
            value={formatMoney(bankTotal)}
            hint="Tarjeta y transferencia"
            loading={isLoading}
          />
        </div>

        {noClosing && (
          <div className="flex flex-col items-center rounded-xl border py-10 text-center">
            <div className="rounded-full bg-muted p-5 mb-3">
              <History className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="font-medium text-muted-foreground">
              No hubo corte este día.
            </p>
            <p className="text-sm text-muted-foreground">
              Sus cobros se cuentan en el corte siguiente.
            </p>
          </div>
        )}

        <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-4", noClosing && "hidden")}>
          {/* Efectivo: lo que debería haber en caja vs. lo contado. */}
          <Card className="gap-4">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                <CardTitle className="text-lg">Efectivo</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-4">
                <label htmlFor="opening-cash" className="text-muted-foreground">
                  Fondo inicial
                </label>
                <Input
                  id="opening-cash"
                  type="text"
                  inputMode="decimal"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  className={cn("w-32 text-right", !openingValid && "border-my-red")}
                />
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>+ Ventas en efectivo</span>
                <span className="tabular-nums">{formatMoney(cashSales)}</span>
              </div>
              <div className="flex justify-between border-t-2 pt-2 font-semibold">
                <span>Esperado en caja</span>
                <span className="tabular-nums">{formatMoney(expectedCash)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 pt-1">
                <label htmlFor="counted-cash" className="font-medium">
                  Contado
                </label>
                <Input
                  id="counted-cash"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                  className="w-32 text-right"
                />
              </div>
              <div className="flex justify-between">
                <span>Diferencia</span>
                {difference === null ? (
                  <span className="text-muted-foreground">Sin contar</span>
                ) : (
                  <span
                    className={cn(
                      "font-bold tabular-nums",
                      difference < 0 && "text-my-red-dark",
                      difference > 0 && "text-my-green-dark"
                    )}
                  >
                    {difference < 0 ? "−" : difference > 0 ? "+" : ""}
                    {formatMoney(Math.abs(difference))}{" "}
                    <span className="font-normal">
                      {difference < 0 ? "(faltante)" : difference > 0 ? "(sobrante)" : "(cuadra)"}
                    </span>
                  </span>
                )}
              </div>
              {/* Caja de apartados: el efectivo de abonos (y de "Liquidar
                  Cuenta") se guarda aparte, así que no entra al esperado de
                  la caja principal. Sólo informativo: no se cuenta aquí. */}
              <div className="mt-2 flex justify-between rounded-md border px-3 py-2">
                <div>
                  <p className="font-medium">Caja de apartados</p>
                  <p className="text-xs text-muted-foreground">
                    Abonos en efectivo. Se guardan aparte, no en la caja principal.
                  </p>
                </div>
                <span className="font-semibold tabular-nums">
                  {formatMoney(cashPayments)}
                </span>
              </div>
              <Textarea
                placeholder="Notas del corte (opcional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-2"
                rows={2}
              />
            </CardContent>
          </Card>

          {/* Tarjeta y transferencia: cada cobro con su comprobante. */}
          <Card className="gap-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Landmark className="h-5 w-5" />
                  <CardTitle className="text-lg">Tarjeta y transferencia</CardTitle>
                </div>
                {!isLoading && bankCharges.length > 0 && (
                  <Badge variant="secondary">{bankCharges.length}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : bankCharges.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <div className="rounded-full bg-muted p-5 mb-3">
                    <Landmark className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No hubo cobros con tarjeta ni transferencia
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {bankCharges.map((charge) => (
                    <div
                      key={charge.key}
                      className="flex items-center gap-3 border-b py-2 text-sm last:border-b-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium" title={charge.label}>
                          {charge.label}
                        </p>
                        <p className="text-xs text-muted-foreground">{charge.method}</p>
                      </div>
                      <span className="shrink-0 font-semibold tabular-nums">
                        {formatMoney(charge.amount)}
                      </span>
                      {uploadingKey === charge.key ? (
                        <Button variant="outline" size="sm" disabled className="w-28">
                          <Loader2 className="animate-spin" />
                          Subiendo
                        </Button>
                      ) : charge.receiptUrl ? (
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-20 cursor-pointer"
                            onClick={() => setViewing(charge)}
                          >
                            <CheckCircle2 />
                            Ver
                          </Button>
                          {/* Reemplazar: misma ruta en Cloudinary, sobreescribe. */}
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Reemplazar comprobante"
                            aria-label="Reemplazar comprobante"
                            className="h-8 w-7 cursor-pointer"
                            onClick={() => startUpload(charge)}
                          >
                            <Paperclip />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-28 cursor-pointer"
                          onClick={() => startUpload(charge)}
                        >
                          <Paperclip />
                          Adjuntar
                        </Button>
                      )}
                    </div>
                  ))}
                  {/* Leyenda en gris, sin color ni rayas largas. */}
                  <p className="pt-2 text-xs text-muted-foreground">
                    {pendingReceipts > 0
                      ? `${pendingReceipts} ${pendingReceipts === 1 ? "comprobante pendiente. Se puede adjuntar" : "comprobantes pendientes. Se pueden adjuntar"} después de cerrar.`
                      : "Todos los comprobantes están adjuntos."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Un solo input de archivo para todos los "Adjuntar"; sólo imágenes. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />

      <ClosingHistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelect={(day) => {
          setHistoryOpen(false);
          setDate(day);
        }}
      />

      <ReceiptDialog
        url={viewing?.receiptUrl ?? null}
        title={viewing ? `${viewing.label} · ${formatMoney(viewing.amount)}` : ""}
        onClose={() => setViewing(null)}
      />
    </>
  );
}
