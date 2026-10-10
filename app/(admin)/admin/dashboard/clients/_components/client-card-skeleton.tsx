import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Tarjeta de cliente mientras carga: misma estructura que client-card.tsx
// (avatar redondo, nombre y el pie con el saldo).
export function ClientCardSkeleton() {
  return (
    <Card className="flex flex-col gap-0 overflow-hidden py-0">
      <CardContent className="flex flex-1 flex-col items-center justify-center gap-2 p-4 pt-6">
        <Skeleton className="size-12 rounded-full" />
        <Skeleton className="h-6 w-3/4" />
      </CardContent>
      <CardFooter className="justify-center bg-stone-100 p-2">
        <Skeleton className="h-5 w-24 bg-stone-200" />
      </CardFooter>
    </Card>
  );
}
