// app/(admin)/admin/dashboard/pos/_components/sale-complete-modal.tsx
"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, Printer } from "lucide-react";
import { SaleTicket, TicketPreview, type TicketSale } from "../../_components/ticket";
import { printTicket } from "@/lib/print-ticket";
import { toast } from "@/lib/toast";

interface SaleCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Venta tal como la regresa POST /api/sales (misma forma que el
  // Historial de Ventas).
  sale: TicketSale | null;
}

// "¡Venta Completada!": vista previa del ticket (lo mismo que sale en la
// impresora) y botón para imprimirlo. No se imprime solo: la tienda decide
// en cada venta si el cliente quiere ticket.
export function SaleCompleteModal({ isOpen, onClose, sale }: SaleCompleteModalProps) {
  const ticketRef = React.useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = React.useState(false);

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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-my-green-dark" />
            ¡Venta completada!
          </DialogTitle>
          <DialogDescription>Folio {sale.folio}</DialogDescription>
        </DialogHeader>

        <TicketPreview>
          <SaleTicket ref={ticketRef} sale={sale} />
        </TicketPreview>

        <DialogFooter>
          <Button variant="outline" onClick={handlePrint} disabled={isPrinting} className="cursor-pointer">
            {isPrinting ? <Loader2 className="animate-spin" /> : <Printer />}
            Imprimir ticket
          </Button>
          <Button onClick={onClose} className="cursor-pointer">
            Nueva venta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
