"use client";

import * as React from "react";
import { Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Fondo -light con texto -dark del mismo color de marca.
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
    <div className={cn("min-w-0 rounded-xl p-5", COLORS[color])}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{title}</span>
      </div>
      {loading ? (
        <Loader2 className="mt-1 h-8 w-8 animate-spin" />
      ) : (
        <p className="mt-1 truncate text-2xl font-bold" title={valueTitle}>
          {value}
        </p>
      )}
      {hint && <p className="truncate text-xs opacity-75">{hint}</p>}
    </div>
  );
}
