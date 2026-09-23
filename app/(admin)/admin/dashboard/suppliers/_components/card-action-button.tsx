"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Botón de acción de la esquina superior derecha de las tarjetas de
// suppliers/[id] (Corte Mensual, Productos, Detalles del Proveedor).
// Vive compartido porque antes cada tarjeta traía su propia variante —
// outline, ghost, size sm — y no combinaban entre sí.
//
// El icono se baja a 3.5 (14px): el `size-4` por defecto del Button pesa
// demasiado junto al `text-xs`. El `gap-2` del Button ya separa icono y
// texto, así que las llamadas no deben añadir `mr-2` / `ml-2`.
export function CardActionButton({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      variant="outline"
      className={cn(
        "text-xs py-1 rounded-full cursor-pointer [&_svg]:size-3.5",
        className
      )}
      {...props}
    />
  );
}
