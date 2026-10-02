"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, ImageIcon } from "lucide-react";

interface ReceiptDialogProps {
  url: string | null;
  // Para el encabezado: p. ej. "Venta 011026-004" o "Abono de Andrea Rivas".
  title: string;
  onClose: () => void;
}

// Muestra la imagen del comprobante de pago. Se usa en el Corte de Caja y en
// el ticket del Historial de Ventas.
export function ReceiptDialog({ url, title, onClose }: ReceiptDialogProps) {
  return (
    <Dialog open={!!url} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Comprobante
          </DialogTitle>
          <DialogDescription>{title}</DialogDescription>
        </DialogHeader>
        {url && (
          <>
            <div className="max-h-[65vh] overflow-auto rounded-md border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Comprobante: ${title}`} className="w-full" />
            </div>
            <Button variant="outline" asChild className="cursor-pointer">
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink />
                Abrir en otra pestaña
              </a>
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
