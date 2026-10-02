"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { History, Loader2 } from "lucide-react";
import { formatMoney } from "../../sales/sales-utils";

// Forma de GET /api/cash-closing/history. Decimal llega como string; date
// es la columna @db.Date ("2026-10-01T00:00:00.000Z").
type HistoryRow = {
  id: number;
  date: string;
  cashSales: string;
  cashPayments: string;
  bankTotal: string;
  expectedCash: string;
  pendingReceipts: number;
  User: { name: string };
};

interface ClosingHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  // Recibe "YYYY-MM-DD" del corte elegido.
  onSelect: (date: string) => void;
}

export function ClosingHistoryDialog({
  open,
  onClose,
  onSelect,
}: ClosingHistoryDialogProps) {
  const [rows, setRows] = React.useState<HistoryRow[] | null>(null);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setRows(null);
    (async () => {
      try {
        const res = await fetch("/api/cash-closing/history");
        if (!res.ok) throw new Error();
        const data: HistoryRow[] = await res.json();
        if (!cancelled) setRows(data);
      } catch {
        if (!cancelled) setRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Cortes anteriores
          </DialogTitle>
          <DialogDescription>
            Elige un corte para verlo, adjuntar comprobantes o corregirlo.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Fecha</TableHead>
                {/* Mismas cifras que las tarjetas del corte: total cobrado,
                    efectivo esperado (caja principal) y banco. */}
                <TableHead className="text-center">Total cobrado</TableHead>
                <TableHead className="text-center">Efectivo esperado</TableHead>
                <TableHead className="text-center">Banco</TableHead>
                <TableHead className="text-center">Pendientes</TableHead>
                <TableHead className="pr-4 text-center">Cerró</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows === null ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-20">
                    <div className="flex justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                    Todavía no hay cortes cerrados.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const day = row.date.slice(0, 10);
                  return (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer"
                      onClick={() => onSelect(day)}
                    >
                      <TableCell className="pl-4">
                        {day.split("-").reverse().join("/")}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {formatMoney(
                          Number(row.cashSales) +
                            Number(row.cashPayments) +
                            Number(row.bankTotal)
                        )}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {formatMoney(Number(row.expectedCash))}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {formatMoney(Number(row.bankTotal))}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {row.pendingReceipts > 0 ? row.pendingReceipts : "Ninguno"}
                      </TableCell>
                      <TableCell className="pr-4 text-center">{row.User.name}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
