"use client";

import * as React from "react";
import { type LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Tarjeta blanca con borde gris; sólo la franja del título va de color
// (fondo -light, texto -dark). Antes toda la tarjeta iba de color y, con
// varias por página, se sentía pesado.
const COLORS = {
  yellow: "bg-my-yellow-light text-my-yellow-dark",
  blue: "bg-my-blue-light text-my-blue-dark",
  pink: "bg-my-pink-light text-my-pink-dark",
  green: "bg-my-green-light text-my-green-dark",
  purple: "bg-my-purple-light text-my-purple-dark",
  orange: "bg-my-orange-light text-my-orange-dark",
} as const;

interface StatCardProps {
  color: keyof typeof COLORS;
  icon: LucideIcon;
  title: string;
  // Contenido principal (número, monto o nombre). Si es largo se corta con
  // "…"; `valueTitle` lo muestra completo al pasar el mouse.
  value: React.ReactNode;
  valueTitle?: string;
  // Línea pequeña debajo del valor.
  hint?: React.ReactNode;
  loading?: boolean;
}

// Renglón de tarjetas de resumen. En celular es un carrusel de una fila que
// se desliza de lado (cada tarjeta al 80% del ancho para que se asome la
// siguiente) en vez de apilarlas; desde md, la cuadrícula de 3 columnas.
// El -mx-4/px-4 deja que el carrusel llegue a las orillas de la pantalla
// (las páginas tienen p-4). Es una clase y no un componente para poder
// usarla también en un motion.div.
export const STAT_ROW =
  "-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 [scrollbar-width:none] *:w-[80%] *:shrink-0 *:snap-start md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 md:*:w-auto";

// Tarjeta de resumen ("highlight") de las páginas de lista: ícono + título,
// valor principal y subtítulo pequeño. Úsala en vez de armar el div a mano
// para que todas las páginas se vean igual.
export function StatCard({
  color,
  icon: Icon,
  title,
  value,
  valueTitle,
  hint,
  loading,
}: StatCardProps) {
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border bg-card">
      {/* Franja de color con ícono y título, centrados. */}
      <div className={cn("flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium", COLORS[color])}>
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{title}</span>
      </div>
      <div className="px-4 py-4 text-center">
        {/* Cargando: barras grises en el lugar del valor y de la pista, con
            el mismo alto que el texto real. La pista no se muestra antes de
            tiempo ("Sin ventas" mientras carga sería falso). */}
        {loading ? (
          <>
            <Skeleton className="mx-auto mt-1 mb-1 h-5 w-24" />
            <Skeleton className="mx-auto h-3 w-32" />
          </>
        ) : (
          <>
            <p className="truncate text-xl font-bold" title={valueTitle}>
              {value}
            </p>
            {hint && <p className="truncate text-xs">{hint}</p>}
          </>
        )}
      </div>
    </div>
  );
}
