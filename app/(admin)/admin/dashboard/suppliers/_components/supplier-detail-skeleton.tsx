import { CardSkeleton, PageHeaderSkeleton } from "../../_components/skeletons";

// suppliers/[id] mientras carga: encabezado (regresar, nombre, búsqueda y
// "Agregar") y las tarjetas en el mismo orden que la página real: Corte
// Mensual y Productos lado a lado, luego Promociones, Movimientos y Detalles.
export function SupplierDetailSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <PageHeaderSkeleton actions={2} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CardSkeleton rows={6} />
        <CardSkeleton rows={6} />
      </div>
      <CardSkeleton rows={2} />
      <CardSkeleton rows={4} />
      <CardSkeleton rows={3} />
    </div>
  );
}
