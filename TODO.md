# Pendientes

Lista viva de trabajo acordado pero no implementado todavía. Cuando algo se
termina, se tacha o se borra de aquí (no se deja como "hecho" acumulando
ruido).

## Historial de movimientos por proveedor

**Objetivo:** una sección donde se vean todas las altas y retiros de
inventario de los productos de un proveedor — la bitácora que hoy sólo vive
en la base de datos.

Ya existe:
- Modelo `StockMovement` (`prisma/schema.prisma`) — tipo, cantidad, motivo,
  quién lo hizo, y `pickedUpBy` (quién recogió, sólo en retiros).
- `GET /api/products/[id]/stock` — bitácora de **un** producto.

Falta:
- [ ] Decidir el alcance del endpoint: el que existe es *por producto*. Un
      historial *por proveedor* necesita agregar movimientos de todos sus
      productos — probablemente un endpoint nuevo,
      `GET /api/suppliers/[id]/stock-movements`, que une por
      `Product.supplierId`.
- [ ] Pantalla o sección donde mostrarlo — ¿tab nuevo en
      `suppliers/[id]/page.tsx`, o ruta aparte?
- [ ] Filtros razonables: por tipo (Alta/Retiro), rango de fechas, producto.
- [ ] Columnas: fecha, producto, tipo, cantidad, motivo, quién lo registró,
      y "Recogido por" cuando aplique.
- [ ] **Los productos retirados (soft-delete) deben seguir apareciendo en
      este historial.** Hoy el catálogo, el POS y "Ver todos" de inventario
      excluyen productos con `status = "Retirado"` — eso está bien y no se
      toca. Pero la consulta de movimientos para este historial **no** debe
      filtrar por `status`, o los retiros de productos ya eliminados
      desaparecerían del registro. El historial es la única vista pensada
      para ser la excepción a esa regla.

## Eliminar producto: separar "retirar" (ya existe) de "eliminar permanentemente" (no existe)

Hoy "Eliminar producto" en `product-details-modal.tsx` es un soft-delete:
pone `status = "Retirado"` y ya queda fuera de catálogo, POS y listas — eso
es correcto y se queda igual.

Falta una acción aparte, más destructiva, para cuando la tienda decida
limpiar productos retirados viejos:

- [ ] Definir dónde vive esa acción — probablemente en el Historial de
      arriba (ahí es donde tiene sentido "eliminar permanentemente" algo que
      ya está retirado), no en el modal de detalle normal.
- [ ] Ojo con las foreign keys: `Product` tiene relaciones con
      `StockMovement`, `SaleItem` y `LayawayItem`, sin `onDelete: Cascade`
      en el schema actual. Un hard-delete real de un producto con historial
      choca contra esas FK. Hay que decidir: ¿bloquear el borrado si hay
      movimientos/ventas asociadas (como ya se hace hoy al borrar un
      supplier o un cliente), o migrar el schema para permitirlo?
- [ ] Confirmación reforzada (escribir el nombre del producto, por ejemplo)
      dado que es irreversible — a diferencia del "Retirar" actual, que se
      puede deshacer con `POST /api/products/[id]/restore`.
