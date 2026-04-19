"use client";

import Image from "next/image";
import { MoreHorizontal, Package } from "lucide-react";
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
  mode?: "product" | "service";
  onEdit: (product: Product) => void;
  onWithdraw: (product: Product) => void;
  onAssign: (product: Product) => void; // <-- AÑADIR PROPIEDAD
}

export function ProductsTable({
  products,
  suppliers,
  mode = "product",
  onEdit,
  onWithdraw,
  onAssign,
}: ProductsTableProps) {
  const isServiceMode = mode === "service";
  // Creamos un mapa para buscar nombres de proveedores de forma eficiente.
  // Suppliers.id es number (DB), product.supplierId es string (tras normalizar),
  // así que llavemos el mapa con strings para que coincidan.
  const supplierMap = new Map(
    suppliers.map((s) => [String(s.id), s.businessName])
  );

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
            <TableHead className="text-right">
              {isServiceMode ? "Inventario" : "Cantidad"}
            </TableHead>
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
                  {product.photoUrl ? (
                    <Image
                      src={product.photoUrl}
                      alt={product.title}
                      width={48}
                      height={48}
                      className="rounded-md object-cover aspect-square"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-md border bg-muted flex items-center justify-center">
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{product.title}</TableCell>
                <TableCell>{supplierMap.get(product.supplierId) ?? "N/A"}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1 items-start">
                    <Badge
                      variant={
                        product.status === "Disponible" ? "default" : "secondary"
                      }
                    >
                      {product.status}
                    </Badge>
                    {(product.reservedCount ?? 0) > 0 && (
                      <Badge className="bg-amber-500 text-white text-xs">
                        {product.reservedCount} apartado
                        {(product.reservedCount ?? 0) > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(product.price)}</TableCell>
                <TableCell className="text-right">
                  {product.type === "SERVICE" ? (
                    <Badge variant="outline" className="border-sky-400 text-sky-700">
                      Servicio
                    </Badge>
                  ) : (
                    <div className="flex flex-col items-end leading-tight">
                      <span>{product.quantity}</span>
                      {(product.reservedCount ?? 0) > 0 && (
                        <span className="text-xs text-amber-600">
                          {product.quantity - (product.reservedCount ?? 0)} libres
                        </span>
                      )}
                    </div>
                  )}
                </TableCell>
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
                      {/* Sólo permite apartar cuando queden unidades libres y no sea servicio. */}
                      {product.type !== "SERVICE" &&
                        product.status === "Disponible" &&
                        product.quantity - (product.reservedCount ?? 0) > 0 && (
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
                {isServiceMode
                  ? "No se encontraron servicios."
                  : "No se encontraron productos."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}