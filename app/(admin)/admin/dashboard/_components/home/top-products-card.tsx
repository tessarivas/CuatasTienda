"use client";

import { motion } from "motion/react";
import { Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type DashboardData, money } from "./types";

// El primer lugar en el color primary; los demás en grises cada vez más
// claros para no competir con él.
const BAR = ["bg-primary", "bg-foreground/70", "bg-foreground/50", "bg-foreground/35", "bg-foreground/25"];

export function TopProductsCard({ products }: { products: DashboardData["topProducts"] }) {
  const top = products[0]?.units ?? 1;
  return (
    <Card className="h-full min-h-0 gap-4">
      <CardHeader className="shrink-0">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          <CardTitle className="text-lg">Más vendidos</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">Últimos 30 días, por piezas</p>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-y-auto">
        {products.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="mb-3 rounded-full bg-muted p-5">
              <Trophy className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Sin ventas en los últimos 30 días</p>
          </div>
        ) : (
          <div className="space-y-4">
            {products.map((p, i) => (
              <div key={p.title} className="space-y-1.5">
                <div className="flex items-center gap-3 text-sm">
                  {/* Lugar en un círculo con contorno, como los iconos de
                      Actividad reciente. */}
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-foreground/70 bg-card font-bold tabular-nums",
                      i === 0 ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium" title={p.title}>
                    {p.title}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {p.units} {p.units === 1 ? "pieza" : "piezas"} · {money(p.total)}
                  </span>
                </div>
                <div className="ml-11 h-2 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className={cn("h-full rounded-full", BAR[i])}
                    initial={{ width: 0 }}
                    animate={{ width: `${(p.units / top) * 100}%` }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 + i * 0.08 }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
