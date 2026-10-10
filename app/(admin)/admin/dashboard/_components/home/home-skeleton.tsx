import { Clock, Package, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { StatCard, STAT_ROW } from "../stat-card";
import { CardSkeleton } from "../skeletons";

// Inicio mientras llega /api/dashboard: la misma cuadrícula que la página real
// (tres resúmenes + gráfica arriba, pendientes / más vendidos / actividad
// abajo) para que al llegar los datos nada cambie de lugar. Los resúmenes ya
// muestran su título; sólo el valor está en gris.
export function HomeSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className={cn(STAT_ROW, "lg:grid-cols-1 lg:grid-rows-3")}>
          <StatCard color="yellow" icon={Wallet} title="Vendido hoy" value={null} loading />
          <StatCard color="blue" icon={Clock} title="Apartados activos" value={null} loading />
          <StatCard color="pink" icon={Package} title="En tienda" value={null} loading />
        </div>
        <Card className="gap-4 lg:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-7 w-48 rounded-full" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:grid-rows-[28rem]">
        <CardSkeleton rows={5} className="min-h-0" />
        <CardSkeleton rows={5} className="min-h-0" />
        <CardSkeleton rows={5} className="min-h-0" />
      </div>
    </>
  );
}
