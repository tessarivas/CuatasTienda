"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type Product, type Supplier } from "@/lib/data";

// Usamos Omit para definir los datos que necesitamos para un producto nuevo.
// El 'id' y 'status' se generarán automáticamente.
export type NewProductData = Omit<Product, "id" | "status">;

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (newProduct: NewProductData) => void;
  suppliers: Supplier[];
}

export function AddProductModal({ isOpen, onClose, onAdd, suppliers }: AddProductModalProps) {
  const [title, setTitle] = React.useState("");
  const [price, setPrice] = React.useState(0);
  const [quantity, setQuantity] = React.useState(1);
  const [photoUrl, setPhotoUrl] = React.useState("");
  const [supplierId, setSupplierId] = React.useState("");

  const handleSubmit = () => {
    // Validación: Asegurarse de que los campos obligatorios estén llenos.
    if (!title || !price || !quantity || !supplierId) {
      alert("Todos los campos son obligatorios, incluyendo el proveedor.");
      return;
    }
    
    onAdd({
      title,
      price,
      quantity,
      photoUrl: photoUrl || "/products/default-product.png", // Usar una imagen por defecto si no se provee URL
      supplierId,
    });

    // Limpiar el formulario y cerrar el modal
    setTitle("");
    setPrice(0);
    setQuantity(1);
    setPhotoUrl("");
    setSupplierId("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Agregar Nuevo Producto</DialogTitle>
          <DialogDescription>
            Completa los detalles para registrar un nuevo producto en el inventario.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="supplier" className="text-right">Proveedor</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger id="supplier" className="col-span-3">
                <SelectValue placeholder="Selecciona un proveedor" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.businessName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">Título</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="price" className="text-right">Precio</Label>
            <Input id="price" type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantity" className="text-right">Cantidad</Label>
            <Input id="quantity" type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="photoUrl" className="text-right">URL de Foto</Label>
            <Input id="photoUrl" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} className="col-span-3" placeholder="Ej: /products/mi-producto.jpg" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit}>Agregar Producto</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}