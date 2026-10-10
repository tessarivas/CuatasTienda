import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const WIDTHS = ["w-2/3", "w-1/2", "w-3/5", "w-2/5"];

// Renglones de una lista dentro de una tarjeta (historial de movimientos,
// pendientes, actividad): concepto y fecha a la izquierda, monto a la derecha.
export function ListRowsSkeleton({
  rows = 4,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className={cn("h-4", WIDTHS[i % WIDTHS.length])} />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-4 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}
