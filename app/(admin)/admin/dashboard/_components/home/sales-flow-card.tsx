"use client";

import * as React from "react";
import { motion } from "motion/react";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type SeriesPoint, dayLabel, money } from "./types";

const RANGES = [
  { days: 7, label: "7 días" },
  { days: 14, label: "14 días" },
  { days: 30, label: "30 días" },
] as const;

// Mismos colores que las tarjetas de dinero del Historial de Ventas. Las
// barras van en el tono -light en reposo y en el tono base al pasar el mouse
// (`bar`); `dot` es el punto de la leyenda, siempre en el tono base.
const PARTS = [
  { key: "efectivo", label: "Efectivo", dot: "bg-my-green", bar: "bg-my-green-light group-hover:bg-my-green", ring: "var(--my-green)", track: "var(--my-green-light)" },
  { key: "banco", label: "Banco", dot: "bg-my-purple", bar: "bg-my-purple-light group-hover:bg-my-purple", ring: "var(--my-purple)", track: "var(--my-purple-light)" },
  { key: "apartados", label: "Apartados", dot: "bg-my-orange", bar: "bg-my-orange-light group-hover:bg-my-orange", ring: "var(--my-orange)", track: "var(--my-orange-light)" },
] as const;

type PartKey = (typeof PARTS)[number]["key"];

// Pestañas con una píldora que se desliza a la opción elegida.
function SmoothTabs({ value, onChange }: { value: number; onChange: (days: number) => void }) {
  return (
    <div className="flex rounded-full bg-muted p-1 text-xs font-medium">
      {RANGES.map((r) => (
        <button
          key={r.days}
          type="button"
          onClick={() => onChange(r.days)}
          className={cn(
            "relative cursor-pointer rounded-full px-3 py-1 transition-colors",
            value === r.days ? "text-background" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {value === r.days && (
            <motion.span
              layoutId="sales-range-pill"
              className="absolute inset-0 rounded-full bg-foreground"
              transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
            />
          )}
          <span className="relative">{r.label}</span>
        </button>
      ))}
    </div>
  );
}

// Anillos concéntricos (estilo "actividad" de Apple): cada uno es la parte
// de un destino del dinero sobre el total del rango.
function MoneyRings({ totals, total }: { totals: Record<PartKey, number>; total: number }) {
  const size = 132;
  const stroke = 12;
  const gap = 3;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      {PARTS.map((part, i) => {
        const r = size / 2 - stroke / 2 - i * (stroke + gap);
        const circumference = 2 * Math.PI * r;
        const share = total > 0 ? totals[part.key] / total : 0;
        return (
          <g key={part.key}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={part.track} strokeWidth={stroke} />
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={part.ring}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference * (1 - share) }}
              transition={{ duration: 1, ease: "easeOut", delay: i * 0.12 }}
            />
          </g>
        );
      })}
    </svg>
  );
}

export function SalesFlowCard({ series }: { series: SeriesPoint[] }) {
  const [days, setDays] = React.useState<number>(7);
  const [hovered, setHovered] = React.useState<string | null>(null);

  const points = series.slice(-days);
  const dayTotal = (p: SeriesPoint) => p.efectivo + p.banco + p.apartados;
  const max = Math.max(...points.map(dayTotal), 1);
  const totals = {
    efectivo: points.reduce((sum, p) => sum + p.efectivo, 0),
    banco: points.reduce((sum, p) => sum + p.banco, 0),
    apartados: points.reduce((sum, p) => sum + p.apartados, 0),
  };
  const total = totals.efectivo + totals.banco + totals.apartados;
  const count = points.reduce((sum, p) => sum + p.count, 0);
  // Con 30 barras no caben todas las fechas: sólo algunas.
  const labelEvery = days <= 7 ? 1 : days <= 14 ? 2 : 5;

  return (
    <Card className="gap-4">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            <CardTitle className="text-lg">Ventas</CardTitle>
          </div>
          <SmoothTabs value={days} onChange={setDays} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6 md:flex-row">
          <div className="min-w-0 flex-1">
            <p className="text-3xl font-bold tabular-nums">{money(total)}</p>
            <p className="text-sm text-muted-foreground">
              {count} {count === 1 ? "venta" : "ventas"} en los últimos {days} días
            </p>

            {/* Barras apiladas por día. El alto se anima al cambiar de rango. */}
            <div className="mt-5 flex h-40 items-end gap-1">
              {points.map((p) => {
                const t = dayTotal(p);
                return (
                  <div
                    key={p.date}
                    className="group relative flex h-full flex-1 flex-col justify-end"
                    onMouseEnter={() => setHovered(p.date)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    {hovered === p.date && (
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-36 -translate-x-1/2 rounded-lg border bg-background p-2 text-xs shadow-md">
                        <p className="font-semibold">{dayLabel(p.date)}</p>
                        {PARTS.map((part) => (
                          <p key={part.key} className="flex justify-between gap-2 text-muted-foreground">
                            <span>{part.label}</span>
                            <span className="tabular-nums">{money(p[part.key])}</span>
                          </p>
                        ))}
                        <p className="mt-1 flex justify-between border-t pt-1 font-semibold">
                          <span>Total</span>
                          <span className="tabular-nums">{money(t)}</span>
                        </p>
                      </div>
                    )}
                    <motion.div
                      className={cn(
                        "flex w-full flex-col-reverse overflow-hidden rounded-md",
                        t === 0 && "bg-muted"
                      )}
                      initial={{ height: 0 }}
                      animate={{ height: t === 0 ? 4 : `${(t / max) * 100}%` }}
                      transition={{ type: "spring", bounce: 0.15, duration: 0.6 }}
                    >
                      {t > 0 &&
                        PARTS.map((part) =>
                          p[part.key] > 0 ? (
                            <div
                              key={part.key}
                              className={cn("transition-colors duration-200", part.bar)}
                              style={{ height: `${(p[part.key] / t) * 100}%` }}
                            />
                          ) : null
                        )}
                    </motion.div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex gap-1 text-[10px] text-muted-foreground">
              {points.map((p, i) => (
                <span key={p.date} className="flex-1 truncate text-center">
                  {(points.length - 1 - i) % labelEvery === 0 ? dayLabel(p.date).split(" ")[0] : ""}
                </span>
              ))}
            </div>
          </div>

          {/* Reparto del dinero del rango. */}
          <div className="flex shrink-0 items-center gap-5 md:flex-col md:justify-center md:gap-4">
            <MoneyRings key={days} totals={totals} total={total} />
            <div className="space-y-1.5 text-sm">
              {PARTS.map((part) => (
                <div key={part.key} className="flex items-center gap-2">
                  <span className={cn("h-2.5 w-2.5 rounded-full", part.dot)} />
                  <span className="w-20 text-muted-foreground">{part.label}</span>
                  <span className="font-semibold tabular-nums">{money(totals[part.key])}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
