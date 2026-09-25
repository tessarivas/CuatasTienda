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

## Saldo a favor del cliente: qué pasa con lo que sobra

Un cliente puede quedar sin apartados pero con saldo positivo (p. ej. abonó
$9000, se liquidó una laptop de $8299 y un folder de $5 → le quedan $696).
Hoy ese saldo se queda ahí indefinidamente.

- [ ] Revisar qué debe pasar con ese saldo: ¿se queda como crédito para
      futuros apartados, se le devuelve al cliente, o ambas?
- [ ] Evaluar una opción de "limpiar saldo" en `clients/[id]`. Ojo: no debe
      ser sólo poner `currentBalance` en 0 — tiene que dejar un movimiento en
      el historial (p. ej. "Devolución de saldo", con quién la hizo y cuándo),
      o el cuaderno deja de cuadrar contra el total.
- [ ] Hoy borrar un cliente exige saldo en cero (`DELETE /api/clients/[id]`
      → 409), así que un cliente con saldo a favor no se puede borrar hasta
      que exista esta opción.

## Cliente: el historial como la lista en papel ("cuánto resta")

Hoy la tienda lleva cada cliente a pluma, en una lista que es una suma larga
con un **resta corriente**:

```
CAMISETA          + $200
PANTALÓN          + $250
TOTAL               $450
ABONO             − $100   RESTA $350
ABONO             − $100   RESTA $250
  (con esos $200 se saca el dinero de caja y la camiseta se anota vendida)
APARTÓ CALCETÍN   + $100   RESTA $350
ABONO             − $50    RESTA $300
```

Cuando el cliente pregunta "¿cuánto me falta?", se lee el último RESTA, y
puede pagarlo todo de una vez (ver "liquidar toda la cuenta" abajo).

Cómo mapea al sistema:
- Apartar = sube lo que debe. Abonar = baja lo que debe. **Liquidar (marcar
  vendido) no cambia el RESTA**: sólo mueve dinero que ya estaba abonado de
  "saldo a favor" a "vendido" — en el papel es la nota entre paréntesis.
- **RESTA = suma de apartados activos − saldo a favor.** Con el ejemplo:
  450 − 200 = 250; al liquidar la camiseta queda 250 − 0 = 250 (igual);
  al apartar el calcetín 350 − 0 = 350; al abonar 50, 350 − 50 = 300. ✓
  (Precios = snapshot de `LayawayItem.price`, no el precio actual.)
Ya hecho (migración `layaway_item_history`, aplicada 2026-09-24): el pie
muestra el RESTA actual y el historial se lee como la lista en papel —
apartados (+), abonos (−), ventas discretas, cancelados tachados, RESTA
corriente por renglón. Los apartados existentes tomaron como fecha la de su
`Layaway`; las ventas de antes del cambio salen como "Liquidación" (`legacy`).

- [ ] Probar cancelar un apartado con la ✕ de la tarjeta (debe salir
      tachado en el historial, bajar el resta y la unidad volver a estar
      disponible en inventario). Liquidar ya se probó en la app: sale
      "Vendido: …" en gris y el resta no se mueve.
- [ ] Botón para **liquidar toda la cuenta**: el cliente paga lo que resta y
      se liquidan todos sus apartados de una vez.
  - Si el saldo ya alcanza, sólo liquida todo.
  - Si no, registra un abono por lo que falta (con su método de pago) y
    luego liquida todo — en el historial queda el abono y la liquidación,
    así el cuaderno cuadra.
  - `POST /api/clients/[id]/layaway/liquidate` ya acepta varios `itemIds`.
    Ojo: abono + liquidación son dos llamadas; si la segunda falla, el
    abono ya quedó registrado como saldo a favor (no se pierde, pero hay
    que avisarlo claro). Evaluar si conviene un endpoint que haga ambas en
    una sola transacción.
  - Confirmar antes de ejecutar mostrando el total que se va a cobrar.

## Cliente: acciones sobre apartados y saldo (después de la migración de historial)

Dependen de la migración `layaway_item_history` (status + fechas en
`LayawayItem`).

- [ ] **Fecha de apartado en la tarjeta de Productos Apartados.** El
      historial ya la muestra en el renglón "Apartó: …"; falta en la
      tarjeta de cada producto (p. ej. "Apartado el 1 oct"). Con varias
      unidades del mismo producto, cada una tiene su propia fecha.
- [ ] **Limpiar / vaciar saldo** — ver la sección "Saldo a favor del
      cliente" arriba: debe dejar un movimiento en el historial, no sólo
      poner `currentBalance` en 0.

## Estados vacíos que parpadean mientras carga

`clients/[id]` ya muestra un loader por tarjeta (`isLoadingLayaway` /
`isLoadingMovements`) en vez de "No hay…" mientras llegan sus datos.

- [ ] Revisar si otras páginas con estados vacíos tienen el mismo parpadeo.

## Detalles sueltos en `clients/_components`

Los modales de Apartar Producto y Agregar Abono ya siguen el esquema de
`add-product-modal.tsx` / `edit-supplier-modal.tsx`. Quedan:

- [ ] `add-client-modal.tsx`: typo `cursor-ointer` en "Cancelar".
- [ ] Asteriscos de campo obligatorio en `text-red-500` (add-client,
      add-product, add/edit-supplier); `add-payment-modal.tsx` ya usa
      `text-my-red`.
- [ ] `client-card.tsx` tiene 1 color crudo de Tailwind.

## Inventario → Servicios: quitar columnas y, después, "registrar servicio"

En la pestaña "Servicios" de `inventory/page.tsx` (tabla en
`inventory/_components/products-table.tsx`), las columnas **Estado** y
**Apartados** no aplican: un servicio no tiene inventario (`quantity` es null,
ver `CLAUDE.md`), así que siempre sale "Disponible" y "Apartar" no tiene
sentido.

- [ ] Ocultar Estado y Apartados cuando la pestaña activa es Servicios
      (ajustar los `colSpan` de las filas vacías / de carga).

Después, a considerar:
- [ ] Una acción de "registrar servicio" — anotar que se hizo un servicio
      (p. ej. una copia, un acta), incluyendo servicios **personalizados**
      con descripción y precio propios, no sólo los del catálogo.
- [ ] Ojo: hoy no hay dónde persistir eso. El POS no guarda ventas (no
      existe `/api/sales`) y los `Sale` sólo se crean al liquidar apartados.
      Registrar servicios probablemente implica ese endpoint o uno nuevo.

## Inventario → Productos: no mostrar "Disponible" si todo está apartado

En `inventory/_components/products-table.tsx`, un producto con 1 unidad y 1
apartado muestra a la vez "Disponible" y "1 Apartado" (p. ej. la Sudadera
Diamante). No queda nada disponible, así que el badge "Disponible" sobra.

- [ ] Mostrar "Disponible" sólo si `quantity - reservedCount > 0`. Aplica en
      general, no sólo con 1 unidad: 3 unidades con 3 apartadas tampoco
      deberían decir "Disponible". Si todo está apartado, queda sólo el
      badge "N Apartado(s)" (el botón "Apartar" ya se deshabilita en ese
      caso).
- [ ] Revisar que el filtro "Todos los estatus" → "Disponible" sea
      coherente con esto: hoy filtra por `Product.status`, que sigue siendo
      "Disponible" aunque todo esté apartado (las reservas se derivan de
      `LayawayItem`, nunca de `status` — ver `CLAUDE.md`).

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
