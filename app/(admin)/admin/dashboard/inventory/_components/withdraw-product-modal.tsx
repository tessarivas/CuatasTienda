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
import { type Product } from "@/lib/data";

interface WithdrawProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (productId: string, reason: string, user: string) => void;
  product: Product | null;
}

export function WithdrawProductModal({
  isOpen,
  onClose,
  onConfirm,
  product,
}: WithdrawProductModalProps) {
  if (!product) return null;

  const handleConfirm = () => {
    onConfirm(product.id, "", "");
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Retirar este producto?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{product.title}</strong> dejará de aparecer en el
            inventario. El registro se conserva para reportes históricos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="cursor-pointer">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
          >
            Retirar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
