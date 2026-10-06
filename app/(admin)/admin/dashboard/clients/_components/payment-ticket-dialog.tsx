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
import { Loader2, Printer } from "lucide-react";
import { PaymentTicket, TicketPreview, type TicketPayment } from "../../_components/ticket";
import { printTicket } from "@/lib/print-ticket";
import { toast } from "@/lib/toast";

// Comprobante de un abono para el cliente: vista previa (igual a lo que
// sale en la impresora de tickets) y botón para imprimirlo. El estado de
// la cuenta es el del momento de imprimir.
export function PaymentTicketDialog({
  payment,
  onClose,
}: {
  payment: TicketPayment | null;
  onClose: () => void;
}) {
  const ticketRef = React.useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = React.useState(false);

  const handlePrint = async () => {
    if (!ticketRef.current || isPrinting) return;
    setIsPrinting(true);
    try {
      await printTicket(ticketRef.current);
    } catch (err) {
      console.error("Imprimir comprobante de abono falló", err);
      toast.error("No se pudo imprimir el comprobante");
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Dialog open={!!payment} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Comprobante de abono
          </DialogTitle>
          <DialogDescription>{payment?.clientName}</DialogDescription>
        </DialogHeader>

        {payment && (
          <TicketPreview>
            <PaymentTicket ref={ticketRef} payment={payment} />
          </TicketPreview>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="cursor-pointer">
            Cerrar
          </Button>
          <Button onClick={handlePrint} disabled={isPrinting} className="cursor-pointer">
            {isPrinting ? <Loader2 className="animate-spin" /> : <Printer />}
            Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
