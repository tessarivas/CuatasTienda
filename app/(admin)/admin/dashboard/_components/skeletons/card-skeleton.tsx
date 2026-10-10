import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ListRowsSkeleton } from "./list-rows-skeleton";

// Tarjeta completa mientras carga, con la forma de las tarjetas de las
// páginas de detalle: ícono + título arriba y renglones de lista adentro.
export function CardSkeleton({
  rows = 4,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="size-5 rounded-full" />
          <Skeleton className="h-5 w-40" />
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <ListRowsSkeleton rows={rows} />
      </CardContent>
    </Card>
  );
}
