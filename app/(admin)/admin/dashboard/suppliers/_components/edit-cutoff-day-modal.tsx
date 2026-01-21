"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { type Supplier } from "@/lib/data";

interface EditCutoffDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier;
  onSave: (newCutoffDay: number) => void;
}

export function EditCutoffDayModal({
  isOpen,
  onClose,
  supplier,
  onSave,
}: EditCutoffDayModalProps) {
  const [day, setDay] = React.useState(supplier.cutoffDay);

  const handleSave = () => {
    onSave(day);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Día de Corte</DialogTitle>
          <DialogDescription>
            Selecciona el nuevo día de corte para{" "}
            <span className="font-bold">{supplier.businessName}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="cutoffDay">Día del mes (1-31)</Label>
          <Input
            id="cutoffDay"
            type="number"
            min="1"
            max="31"
            value={day}
            onChange={(e) => setDay(Number(e.target.value))}
            className="mt-2"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="cursor-pointer">
            Cancelar
          </Button>
          <Button onClick={handleSave} className="cursor-pointer">Guardar Cambio</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}