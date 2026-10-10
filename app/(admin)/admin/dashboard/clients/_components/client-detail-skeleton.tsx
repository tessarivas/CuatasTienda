import type { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ListRowsSkeleton } from "../../_components/skeletons";

// Cuadrícula de "Productos Apartados" mientras carga: mosaicos con la forma
// de los reales (foto cuadrada, nombre, precio y fecha).
export function LayawayGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-lg border p-3">
          <Skeleton className="aspect-square w-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Tarjeta de clients/[id] con el título ya visible pero el contenido en gris.
function DetailCardSkeleton({ children }: { children: ReactNode }) {
  return (
    <Card className="flex flex-col lg:h-full lg:min-h-0">
      <CardHeader className="shrink-0">
        <div className="flex items-center gap-2">
          <Skeleton className="size-5 rounded-full" />
          <Skeleton className="h-5 w-44" />
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">{children}</CardContent>
    </Card>
  );
}

// clients/[id] completo mientras llega el cliente: encabezado (regresar,
// nombre + "Cuenta del cliente", Editar / Apartar / Abonar) y las dos columnas
// (apartados e historial), con el mismo alto fijo en pantallas grandes.
export function ClientDetailSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4 lg:h-full">
      <div className="flex shrink-0 flex-col md:flex-row md:items-center md:gap-4">
        <div className="flex items-center gap-2">
          <Skeleton className="size-9" />
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 md:mt-0 md:ml-auto">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-2">
        <DetailCardSkeleton>
          <LayawayGridSkeleton />
        </DetailCardSkeleton>
        <DetailCardSkeleton>
          <ListRowsSkeleton rows={6} />
        </DetailCardSkeleton>
      </div>
    </div>
  );
}
