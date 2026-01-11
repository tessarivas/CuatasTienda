"use client";

import Image from "next/image";
import { MoreHorizontal } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type Product, type Supplier } from "@/lib/data";

interface ProductsTableProps {
  products: Product[];
  suppliers: Supplier[];
  onEdit: (product: Product) => void;
  onWithdraw: (product: Product) => void;
  onAssign: (product: Product) => void; // <-- AÑADIR PROPIEDAD
}

export function ProductsTable({ products, suppliers, onEdit, onWithdraw, onAssign }: ProductsTableProps) {
  // Creamos un mapa para buscar nombres de proveedores de forma eficiente
  const supplierMap = new Map(suppliers.map((s) => [s.id, s.businessName]));

  // Función para formatear precios a moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Foto</TableHead>
            <TableHead>Título</TableHead>
            <TableHead>Proveedor</TableHead>
            <TableHead>Estatus</TableHead>
            <TableHead className="text-right">Precio</TableHead>
            <TableHead className="text-right">Cantidad</TableHead>
            <TableHead>
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.length > 0 ? (
            products.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <Image
                    src={product.photoUrl}
                    alt={product.title}
                    width={48}
                    height={48}
                    className="rounded-md object-cover aspect-square"
                  />
                </TableCell>
                <TableCell className="font-medium">{product.title}</TableCell>
                <TableCell>{supplierMap.get(product.supplierId) ?? "N/A"}</TableCell>
                <TableCell>
                  <Badge variant={product.status === "Disponible" ? "default" : "secondary"}>
                    {product.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(product.price)}</TableCell>
                <TableCell className="text-right">{product.quantity}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                      <DropdownMenuItem onSelect={() => onEdit(product)}>Editar</DropdownMenuItem>
                      {/* AÑADIR LA NUEVA OPCIÓN, solo si está disponible */}
                      {product.status === "Disponible" && (
                        <DropdownMenuItem onSelect={() => onAssign(product)}>
                          Apartar a Cliente
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onSelect={() => onWithdraw(product)} className="text-red-600">
                        Retirar Mercancía
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                No se encontraron productos.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}