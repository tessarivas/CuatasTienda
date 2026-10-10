import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Tarjeta de producto de la caja mientras carga: misma estructura que la real
// en product-grid.tsx (foto cuadrada, título de 2 renglones, precio).
export function ProductCardSkeleton() {
  return (
    <Card className="gap-3 p-3">
      <Skeleton className="aspect-square w-full" />
      <div className="space-y-1">
        <div className="h-10 space-y-1.5 pt-0.5">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>
        <Skeleton className="h-6 w-20" />
      </div>
    </Card>
  );
}
