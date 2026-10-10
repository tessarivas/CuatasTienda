"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";
import {
  Activity,
  Clock,
  HandCoins,
  PackageMinus,
  PackagePlus,
  Receipt,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type ActivityItem, money } from "./types";

// Icono por tipo. Todos con el mismo contorno oscuro y sin relleno (como
// Pendientes): el icono basta para distinguirlos.
const OUTLINE = "border border-foreground/70 bg-card text-foreground";
const KIND: Record<ActivityItem["type"], { icon: typeof Receipt; tone: string }> = {
  venta: { icon: Receipt, tone: OUTLINE },
  liquidacion: { icon: HandCoins, tone: OUTLINE },
  abono: { icon: Wallet, tone: OUTLINE },
  apartado: { icon: Clock, tone: OUTLINE },
  alta: { icon: PackagePlus, tone: OUTLINE },
  retiro: { icon: PackageMinus, tone: OUTLINE },
};

// Línea de tiempo con lo último que pasó en la tienda.
export function ActivityCard({ activity }: { activity: ActivityItem[] }) {
  return (
    <Card className="h-full min-h-0 gap-4">
      <CardHeader className="shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          <CardTitle className="text-lg">Actividad reciente</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-y-auto pr-4">
        {activity.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="mb-3 rounded-full bg-muted p-5">
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Todavía no hay movimientos</p>
          </div>
        ) : (
          <ol className="relative">
            {activity.map((item, i) => {
              const { icon: Icon, tone } = KIND[item.type];
              const body = (
                <>
                  <span
                    className={cn(
                      "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-card",
                      tone
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    {item.amount !== null && (
                      <p className="text-sm font-semibold tabular-nums">{money(item.amount)}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNowStrict(new Date(item.date), { addSuffix: true, locale: es })}
                    </p>
                  </div>
                </>
              );
              return (
                <motion.li
                  key={item.key}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="relative"
                >
                  {/* Línea que une los iconos. */}
                  {i < activity.length - 1 && (
                    <span className="absolute top-8 bottom-0 left-4 w-px -translate-x-1/2 bg-border" />
                  )}
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="-mx-2 flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 py-2">{body}</div>
                  )}
                </motion.li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
