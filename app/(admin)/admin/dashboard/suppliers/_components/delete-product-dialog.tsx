"use client";

import * as React from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type Product } from "@/lib/data";
import { Loader2, Trash2 } from "lucide-react";

interface DeleteProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  // "Eliminar": soft delete a "Retirado", se puede restaurar.
  onDelete: () => void;
  // "Borrar para siempre": sólo se ofrece si el producto no tiene historial
  // (ver app/api/products/[id]/permanent/route.ts).
  onPermanentDelete: () => Promise<void>;
}

// Normaliza para comparar el nombre escrito: sin mayúsculas, acentos ni
// espacios de más, para que no estorbe al confirmar.
const normalize = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().replace(/\s+/g, " ").toLowerCase();

export function DeleteProductDialog({
  open,
  onOpenChange,
  product,
  onDelete,
  onPermanentDelete,
}: DeleteProductDialogProps) {
  // null = revisando; true/false = si se puede borrar para siempre.
  const [canDelete, setCanDelete] = React.useState<boolean | null>(null);
  const [typed, setTyped] = React.useState("");
  const [isDeleting, setIsDeleting] = React.useState(false);
  const productId = product?.id;

  React.useEffect(() => {
    if (!open || !productId) return;
    let cancelled = false;
    setCanDelete(null);
    setTyped("");
    fetch(`/api/products/${productId}/permanent`)
      .then((res) => (res.ok ? res.json() : { canDelete: false }))
      .then((data: { canDelete: boolean }) => {
        if (!cancelled) setCanDelete(data.canDelete);
      })
      .catch(() => {
        if (!cancelled) setCanDelete(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, productId]);

  if (!product) return null;

  const nameMatches = normalize(typed) === normalize(product.title);

  const handlePermanent = async () => {
    if (!nameMatches || isDeleting) return;
    setIsDeleting(true);
    try {
      await onPermanentDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => !isDeleting && onOpenChange(o)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar este producto?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-bold">{product.title}</span> dejará de aparecer en
            el inventario y en la caja. Su historial se conserva y se puede
            restaurar después.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Borrado permanente: sólo sin historial, y confirmando el nombre. */}
        {canDelete === null ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Revisando el historial del producto...
          </p>
        ) : canDelete ? (
          <div className="space-y-2 rounded-lg border p-3">
            <p className="text-sm">
              Este producto no tiene ventas, apartados ni movimientos. Si se dio
              de alta por error, también puedes{" "}
              <span className="font-semibold">borrarlo para siempre</span>. Esto
              no se puede deshacer.
            </p>
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={`Escribe "${product.title}" para confirmar`}
              aria-label="Nombre del producto para confirmar"
              disabled={isDeleting}
            />
            <Button
              variant="outline"
              className="w-full cursor-pointer border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={!nameMatches || isDeleting}
              onClick={handlePermanent}
            >
              {isDeleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
              Borrar para siempre
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Tiene ventas, apartados o movimientos, así que sólo se puede retirar
            (se conserva para los cortes del proveedor).
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel className="cursor-pointer" disabled={isDeleting}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
          >
            {/* Sin margen manual: AlertDialogAction usa buttonVariants(), que
                ya trae gap-2 entre ícono y texto. */}
            <Trash2 />
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
