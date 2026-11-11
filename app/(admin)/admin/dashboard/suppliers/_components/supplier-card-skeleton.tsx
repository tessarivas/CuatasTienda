import { Card, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Tarjeta de proveedor mientras carga: misma estructura que supplier-card.tsx
// (foto 4:3 a todo lo ancho y el pie con el nombre del negocio).
export function SupplierCardSkeleton() {
  return (
    <Card className="flex flex-col gap-0 overflow-hidden py-0">
      <Skeleton className="aspect-4/3 w-full rounded-none" />
      <CardFooter className="justify-center bg-stone-100 p-2">
        <Skeleton className="h-7 w-28 bg-stone-200" />
      </CardFooter>
    </Card>
  );
}
