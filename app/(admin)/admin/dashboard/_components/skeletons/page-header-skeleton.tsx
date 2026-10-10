import { Skeleton } from "@/components/ui/skeleton";

// Encabezado de una página de detalle cuyo título sale de los datos (nombre
// del cliente o del proveedor): flecha de regreso, título y los botones de
// la derecha. Mismo acomodo que el encabezado real para que nada brinque.
export function PageHeaderSkeleton({ actions = 1 }: { actions?: number }) {
  return (
    <div className="flex shrink-0 flex-col md:flex-row md:items-center md:gap-4">
      <div className="flex items-center gap-2">
        <Skeleton className="size-9" />
        <Skeleton className="h-8 w-56" />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 md:mt-0 md:ml-auto">
        {Array.from({ length: actions }, (_, i) => (
          <Skeleton key={i} className="h-9 w-32" />
        ))}
      </div>
    </div>
  );
}
