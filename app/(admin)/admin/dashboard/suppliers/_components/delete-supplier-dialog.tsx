import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { type Supplier } from "@/lib/data";
import { Trash2 } from "lucide-react";

interface DeleteSupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier | null;
  supplierProductsCount: number;
  onDelete: () => void;
}

export function DeleteSupplierDialog({
  open,
  onOpenChange,
  supplier,
  supplierProductsCount,
  onDelete,
}: DeleteSupplierDialogProps) {
  if (!supplier) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>¿Eliminar proveedor?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción eliminará permanentemente a{" "}
            <strong>{supplier.businessName}</strong>.
            {supplierProductsCount > 0 && (
              <span className="block mt-2 font-medium text-destructive">
                Este proveedor tiene {supplierProductsCount} producto(s)
                asociado(s). Debes retirarlos primero.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="outline" className="cursor-pointer">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={onDelete}
            className="cursor-pointer"
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
