import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

// Qué va en cada columna mientras carga: una miniatura (foto), texto a la
// izquierda, o un valor centrado / a la derecha (montos, estados, botones).
export type SkeletonCell = "image" | "text" | "center" | "end";

// Anchos que se van alternando para que los renglones no se vean idénticos.
const WIDTHS = ["w-3/4", "w-1/2", "w-2/3"];

// Renglones grises con la misma forma que la tabla real. Va dentro del
// <tbody>/<TableBody> en lugar de las filas, así el encabezado de la tabla
// se queda visible desde el principio.
export function TableRowsSkeleton({
  cells,
  rows = 5,
}: {
  cells: SkeletonCell[];
  rows?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }, (_, row) => (
        <TableRow key={row} className="hover:bg-transparent">
          {cells.map((cell, col) => (
            <TableCell
              key={col}
              className={cn(col === 0 && "pl-4", col === cells.length - 1 && "pr-4")}
            >
              {cell === "image" ? (
                <Skeleton className="size-12" />
              ) : (
                <Skeleton
                  className={cn(
                    "h-4",
                    cell === "text" ? WIDTHS[(row + col) % WIDTHS.length] : "w-16",
                    cell === "center" && "mx-auto",
                    cell === "end" && "ml-auto"
                  )}
                />
              )}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
