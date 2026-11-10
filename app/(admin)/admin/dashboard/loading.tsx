"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ListRowsSkeleton } from "./_components/skeletons";
import { STAT_ROW } from "./_components/stat-card";

// Lo que se ve al cambiar de página desde el menú mientras llega el código
// de la página nueva. Sin esto, en producción la página anterior se quedaba
// congelada 1–2 segundos sin ninguna señal (cada página trae su propio
// skeleton, pero ése sólo aparece cuando su código ya cargó). Es genérico
// a propósito: título, tarjetas de resumen y una tarjeta de contenido, el
// acomodo que comparten casi todas las páginas del panel. En cuanto la
// página monta, la reemplaza su skeleton propio y luego los datos.
export default function DashboardLoading() {
  return (
    <div className="space-y-4 p-4" aria-busy="true" aria-label="Cargando">
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-8 w-56" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
      <div className={STAT_ROW}>
        {Array.from({ length: 3 }, (_, i) => (
          <Card key={i} className="gap-3 py-4">
            <CardContent className="space-y-3 px-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-7 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="size-5 rounded-full" />
            <Skeleton className="h-5 w-40" />
          </div>
        </CardHeader>
        <CardContent>
          <ListRowsSkeleton rows={6} />
        </CardContent>
      </Card>
    </div>
  );
}
