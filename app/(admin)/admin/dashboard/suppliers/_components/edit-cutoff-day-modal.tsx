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
  // Día de corte efectivo (el guardado o, si no hay, el día de alta), el
  // mismo que muestra "Corte Mensual". supplier.cutoffDay puede venir vacío.
  cutoffDay: number;
  onSave: (newCutoffDay: number) => void;
}

export function EditCutoffDayModal({
  isOpen,
  onClose,
  supplier,
  cutoffDay,
  onSave,
}: EditCutoffDayModalProps) {
  // Texto, no número: con un número, al borrar quedaba 0 y al escribir 15
  // se veía "015".
  const [day, setDay] = React.useState(String(cutoffDay));
  const dayValue = Number(day);
  const dayValid = Number.isInteger(dayValue) && dayValue >= 1 && dayValue <= 31;

  // Cada vez que se abre parte del día vigente, no del que había al cargar
  // la página (el modal vive montado todo el tiempo).
  React.useEffect(() => {
    if (isOpen) setDay(String(cutoffDay));
  }, [isOpen, cutoffDay]);

  const handleSave = () => {
    if (!dayValid) return;
    onSave(dayValue);
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
            inputMode="numeric"
            onChange={(e) => setDay(e.target.value)}
            className="mt-2"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="cursor-pointer">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!dayValid} className="cursor-pointer">
            Guardar Cambio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}