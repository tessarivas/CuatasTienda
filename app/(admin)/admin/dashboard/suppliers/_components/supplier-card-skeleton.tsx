import { Card, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Tarjeta de proveedor mientras carga: misma estructura que supplier-card.tsx
// (logo cuadrado de 120 px y el pie con el nombre del negocio).
export function SupplierCardSkeleton() {
  return (
    <Card className="flex flex-col gap-0 overflow-hidden py-0">
      <CardHeader className="flex items-center justify-center p-4">
        <Skeleton className="size-[120px]" />
      </CardHeader>
      <CardFooter className="justify-center bg-stone-100 p-2">
        <Skeleton className="h-7 w-28 bg-stone-200" />
      </CardFooter>
    </Card>
  );
}
