"use client";

import Image from "next/image";
import { ClipboardCheck, Package, User, UserRoundCheck } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type Product, type Supplier } from "@/lib/data";

interface ProductsTableProps {
  products: Product[];
  suppliers: Supplier[];
  mode?: "product" | "service";
  onAssign: (product: Product) => void; // <-- AÑADIR PROPIEDAD
  // Click en cualquier parte de la fila (fuera del botón de Apartados) abre
  // el detalle de sólo lectura — ahí viven Editar, Eliminar y los
  // movimientos de stock, ya no en esta tabla.
  onRowClick: (product: Product) => void;
}

// Anchos en porcentaje del ancho total de la tabla (requiere table-fixed).
// Dos sets porque en modo servicio sólo hay Foto, Título, Proveedor y Precio;
// si no se redistribuyera, quedaría un hueco en blanco a la derecha.
const PRODUCT_WIDTHS = {
  foto: "w-[8%]",
  titulo: "w-[30%]",
  proveedor: "w-[14%]",
  estado: "w-[14%]",
  precio: "w-[13%]",
  cantidad: "w-[9%]",
  apartados: "w-[12%]",
};
const SERVICE_WIDTHS = {
  foto: "w-[10%]",
  titulo: "w-[40%]",
  proveedor: "w-[20%]",
  precio: "w-[15%]",
  registrar: "w-[15%]",
};

export function ProductsTable({
  products,
  suppliers,
  mode = "product",
  onAssign,
  onRowClick,
}: ProductsTableProps) {
  const isServiceMode = mode === "service";
  const widths = isServiceMode ? SERVICE_WIDTHS : PRODUCT_WIDTHS;
  // Mapa proveedor completo (no sólo el nombre) para poder mostrar también
  // su logo. Suppliers.id es number (DB), product.supplierId es string (tras
  // normalizar), así que llavemos el mapa con strings para que coincidan.
  const supplierMap = new Map(suppliers.map((s) => [String(s.id), s]));

  // Función para formatear precios a moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  };

  // Un servicio no lleva inventario: no tiene cantidad, siempre saldría
  // "Disponible" y no se puede apartar. En modo servicio se ocultan Estado,
  // Cantidad y Apartados, y en su lugar va "Registrar" (aún sin
  // funcionalidad: necesita que las ventas se guarden, ver TODO.md).
  const columnCount = isServiceMode ? 5 : 7;

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* table-fixed: los anchos de PRODUCT_WIDTHS/SERVICE_WIDTHS son
          proporciones reales del ancho total, no sólo del contenido de cada
          columna (que es lo que hace table-auto, el default). */}
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className={`${widths.foto} pl-4`}>Foto</TableHead>
            <TableHead className={widths.titulo}>Título</TableHead>
            <TableHead className={widths.proveedor}>Proveedor</TableHead>
            {!isServiceMode && (
              <TableHead className={`${PRODUCT_WIDTHS.estado} text-center`}>
                Estado
              </TableHead>
            )}
            <TableHead className={`${widths.precio} text-center`}>
              Precio
            </TableHead>
            {isServiceMode && (
              <TableHead
                className={`${SERVICE_WIDTHS.registrar} pr-4 text-center`}
              >
                Registrar
              </TableHead>
            )}
            {!isServiceMode && (
              <>
                <TableHead className={`${PRODUCT_WIDTHS.cantidad} text-center`}>
                  Cantidad
                </TableHead>
                <TableHead
                  className={`${PRODUCT_WIDTHS.apartados} pr-4 text-center`}
                >
                  Apartados
                </TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.length > 0 ? (
            products.map((product) => {
              // Misma regla que antes decidía si "Apartar a Cliente"
              // aparecía en el menú: no es servicio, está Disponible, y
              // quedan unidades libres.
              const canAssign =
                product.type !== "SERVICE" &&
                product.status === "Disponible" &&
                product.quantity - (product.reservedCount ?? 0) > 0;
              const supplier = supplierMap.get(product.supplierId);

              return (
                <TableRow
                  key={product.id}
                  onClick={() => onRowClick(product)}
                  className="cursor-pointer"
                >
                  <TableCell className="pl-4">
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
                  <TableCell className="font-medium">
                    {/* Con table-fixed la celda ya está acotada al ancho de
                        la columna (widths.titulo); truncate sólo necesita
                        un contenedor de bloque para tener contra qué recortar. */}
                    <span className="block truncate" title={product.title}>
                      {product.title}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 overflow-hidden">
                      {/* Logo pequeño y circular, mismo ícono de respaldo
                          (User) que usa la vista de detalle del proveedor
                          cuando no tiene logo cargado. */}
                      <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full border bg-muted flex items-center justify-center">
                        {supplier?.logo ? (
                          <Image
                            src={supplier.logo}
                            alt={`Logo de ${supplier.businessName}`}
                            width={24}
                            height={24}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <User className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                      <span className="truncate">
                        {supplier?.businessName ?? "N/A"}
                      </span>
                    </div>
                  </TableCell>
                  {!isServiceMode && (
                  <TableCell>
                    {/* Mismos colores que la lista de productos del proveedor:
                        bg-{color}-light + text-{color}-dark. */}
                    <div className="flex flex-col items-center gap-1">
                      {/* "Disponible" sólo si queda al menos una unidad libre;
                          con todo apartado (p. ej. 1 de 1) sobra y confunde —
                          queda sólo el badge "N Apartado(s)". Product.status
                          no refleja reservas, así que se decide aquí. */}
                      {!(
                        product.status === "Disponible" &&
                        product.quantity - (product.reservedCount ?? 0) <= 0 &&
                        (product.reservedCount ?? 0) > 0
                      ) && (
                        <Badge
                          variant="default"
                          className={
                            product.status === "Disponible"
                              ? "bg-my-green-light text-my-green-dark"
                              : "bg-my-red-light text-my-red-dark"
                          }
                        >
                          {product.status}
                        </Badge>
                      )}
                      {(product.reservedCount ?? 0) > 0 && (
                        <Badge
                          variant="default"
                          className="bg-my-orange-light text-my-orange-dark text-xs"
                        >
                          {product.reservedCount} Apartado
                          {(product.reservedCount ?? 0) > 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  )}
                  <TableCell className="text-center">
                    {formatCurrency(product.price)}
                  </TableCell>
                  {isServiceMode && (
                    <TableCell
                      className="pr-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-center">
                        {/* Apagado a propósito hasta que exista dónde guardar
                            el servicio realizado (no hay /api/sales). */}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          title="Próximamente"
                        >
                          <ClipboardCheck />
                          Registrar
                        </Button>
                      </div>
                    </TableCell>
                  )}
                  {!isServiceMode && (
                    <>
                      <TableCell className="text-center">
                        {/* Total en tienda, no disponible/total: un apartado no
                            saca la unidad de la tienda, y el badge "N apartado(s)"
                            ya deja claro que parte de este total no está libre. */}
                        <span className="tabular-nums">{product.quantity}</span>
                      </TableCell>
                      <TableCell
                        className="pr-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-center">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!canAssign}
                            className="cursor-pointer"
                            onClick={() => onAssign(product)}
                          >
                            <UserRoundCheck />
                            Apartar
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={columnCount} className="h-24 text-center">
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
