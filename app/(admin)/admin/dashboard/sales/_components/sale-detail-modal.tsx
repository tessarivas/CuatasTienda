"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ImageIcon, Loader2, Printer, Receipt } from "lucide-react";
import { ReceiptDialog } from "./receipt-dialog";
import { type ApiSaleRow, formatSaleDate, methodLabel, saleOrigin } from "../sales-utils";
import { SaleTicket, TicketPreview } from "../../_components/ticket";
import { printTicket } from "@/lib/print-ticket";
import { toast } from "@/lib/toast";

interface SaleDetailModalProps {
  sale: ApiSaleRow | null;
  onClose: () => void;
}

// Ticket de una venta del historial: la misma vista que "¡Venta
// completada!" en la caja (y que la impresión), más el proveedor de cada
// producto, que sólo se ve aquí y no se imprime. Se puede reimprimir.
export function SaleDetailModal({ sale, onClose }: SaleDetailModalProps) {
  const [showReceipt, setShowReceipt] = React.useState(false);
  const [isPrinting, setIsPrinting] = React.useState(false);
  const ticketRef = React.useRef<HTMLDivElement>(null);
  if (!sale) return null;

  const handlePrint = async () => {
    if (!ticketRef.current || isPrinting) return;
    setIsPrinting(true);
    try {
      await printTicket(ticketRef.current);
    } catch (err) {
      console.error("Imprimir ticket falló", err);
      toast.error("No se pudo imprimir el ticket");
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <>
      <Dialog
        open={!!sale}
        onOpenChange={(open) => {
          if (!open) {
            setShowReceipt(false);
            onClose();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Venta {sale.folio ?? `#${sale.id}`}
            </DialogTitle>
            <DialogDescription>
              {formatSaleDate(sale.date)} · {sale.Client ? `Apartado de ${sale.Client.name}` : saleOrigin(sale)} ·{" "}
              {methodLabel(sale.paymentMethod)}
            </DialogDescription>
          </DialogHeader>

          <TicketPreview>
            <SaleTicket ref={ticketRef} sale={sale} showSuppliers />
          </TicketPreview>

          <DialogFooter>
            {/* Comprobante de tarjeta/transferencia, adjuntado en el Corte
                de Caja. Sin comprobante (pendiente o efectivo) no se ve. */}
            {sale.receiptUrl && (
              <Button
                variant="outline"
                className="cursor-pointer sm:mr-auto"
                onClick={() => setShowReceipt(true)}
              >
                <ImageIcon />
                Ver comprobante adjunto
              </Button>
            )}
            <Button onClick={handlePrint} disabled={isPrinting} className="cursor-pointer">
              {isPrinting ? <Loader2 className="animate-spin" /> : <Printer />}
              Reimprimir ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ReceiptDialog
        url={showReceipt ? sale.receiptUrl : null}
        title={`Venta ${sale.folio ?? `#${sale.id}`}`}
        onClose={() => setShowReceipt(false)}
      />
    </>
  );
}
