import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// "Datos de la cuenta" mientras carga: la misma tarjeta con sus dos campos
// (nombre y correo) y el pie con el botón de guardar.
export function ProfileSkeleton() {
  return (
    <div className="max-w-2xl">
      <Card className="gap-4">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="size-5 rounded-full" />
            <Skeleton className="h-5 w-40" />
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-4">
            <Skeleton className="mr-auto h-3 w-48" />
            <Skeleton className="h-9 w-full sm:w-40" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
