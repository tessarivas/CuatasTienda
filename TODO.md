# Pendientes

Lista viva de trabajo acordado. Arriba va lo pendiente (`- [ ]`); cuando algo
se termina se marca `- [x]` y se mueve a la sección **Completado** al final,
con la fecha, para que se vea de un vistazo qué ya está listo.

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

## Cliente: pendientes de la cuenta (`clients/[id]`)

Cómo lleva la tienda cada cliente hoy, a pluma — la pantalla está pensada
para reemplazar esta lista:

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

Liquidar (marcar vendido) no cambia lo que falta por pagar: baja apartado y
abonado por el mismo monto. Precios = snapshot de `LayawayItem.price`.

- [ ] Probar cancelar un apartado con la ✕ de la tarjeta: debe salir tachado
      en el historial, bajar "Falta por pagar" y la unidad volver a estar
      disponible en inventario.
- [ ] **Fecha de apartado en la tarjeta** de Productos Apartados (p. ej.
      "Apartado el 1 oct"). El historial ya la muestra en "Apartó: …". Con
      varias unidades del mismo producto, cada una tiene su propia fecha.
- [ ] Botón para **liquidar toda la cuenta**: el cliente paga lo que falta y
      se liquidan todos sus apartados de una vez.
  - Si el saldo ya alcanza, sólo liquida todo.
  - Si no, registra un abono por lo que falta (con su método de pago) y
    luego liquida todo — en el historial queda el abono y la liquidación.
  - `POST /api/clients/[id]/layaway/liquidate` ya acepta varios `itemIds`.
    Ojo: abono + liquidación son dos llamadas; si la segunda falla, el
    abono ya quedó registrado como saldo (no se pierde, pero hay que
    avisarlo claro). Evaluar un endpoint que haga ambas en una transacción.
  - Confirmar antes de ejecutar mostrando el total que se va a cobrar.

## Saldo a favor del cliente: qué pasa con lo que sobra

Un cliente puede quedar sin apartados pero con saldo positivo (el pie lo
muestra como "Le sobran $X"). Hoy ese saldo se queda ahí indefinidamente.

- [ ] Revisar qué debe pasar con ese saldo: ¿se queda como crédito para
      futuros apartados, se le devuelve al cliente, o ambas?
- [ ] Opción de **limpiar / vaciar saldo** en `clients/[id]`. Ojo: no debe
      ser sólo poner `currentBalance` en 0 — tiene que dejar un movimiento en
      el historial (p. ej. "Devolución de saldo", con quién la hizo y
      cuándo), o el historial deja de cuadrar contra el total.
- [ ] Hoy borrar un cliente exige saldo en cero (`DELETE /api/clients/[id]`
      → 409), así que un cliente con saldo a favor no se puede borrar hasta
      que exista esta opción.

## Inventario

- [ ] **Servicios → darle funcionalidad al botón "Registrar"** (hoy está
      deshabilitado a propósito, "Próximamente"): anotar que se hizo un
      servicio (p. ej. una copia, un acta), incluyendo servicios
      **personalizados** con descripción y precio propios. Ojo: hoy no hay
      dónde guardarlo — el POS no guarda ventas (no existe `/api/sales`) y
      los `Sale` sólo se crean al liquidar apartados.

## Eliminar producto: separar "retirar" (ya existe) de "eliminar permanentemente" (no existe)

Hoy "Eliminar producto" en `product-details-modal.tsx` es un soft-delete:
pone `status = "Retirado"` y ya queda fuera de catálogo, POS y listas — eso
es correcto y se queda igual.

Falta una acción aparte, más destructiva, para cuando la tienda decida
limpiar productos retirados viejos:

- [ ] Definir dónde vive esa acción — probablemente en el Historial por
      proveedor de arriba, no en el modal de detalle normal.
- [ ] Ojo con las foreign keys: `Product` tiene relaciones con
      `StockMovement`, `SaleItem` y `LayawayItem`, sin `onDelete: Cascade`
      en el schema actual. Un hard-delete real de un producto con historial
      choca contra esas FK. Hay que decidir: ¿bloquear el borrado si hay
      movimientos/ventas asociadas (como ya se hace hoy al borrar un
      supplier o un cliente), o migrar el schema para permitirlo?
- [ ] Confirmación reforzada (escribir el nombre del producto, por ejemplo)
      dado que es irreversible — a diferencia del "Retirar" actual, que se
      puede deshacer con `POST /api/products/[id]/restore`.

## Caja registradora (POS)

- [ ] El filtro de proveedor de `pos/_components/product-grid.tsx` muestra
      "Proveedor 3", "Proveedor 5"… (el id), no el nombre del proveedor.
- [ ] Colores crudos `text-green-600` para descuentos en `cart.tsx`,
      `cart-item-row.tsx`, `discount-modal.tsx` y `sale-complete-modal.tsx`
      — pasar a `text-my-green-dark`.
- [ ] Recordatorio: la caja **no guarda ventas** (no existe `/api/sales`);
      al cobrar sólo cambia el estado en memoria. Bloquea también
      "registrar servicio" y que "Más ventas en {mes}" cuente la caja.

## Notificaciones (toasts) y spinner

El commit `4fcab11` ("UI small changes", 2026-04-19) agregaba `sonner`
(toasts), un componente `spinner` y ajustes a `button` / `alert-dialog`. Al
juntar con `main` (2026-10-01) se le dio prioridad a la rama y ese código no
entró; sigue en el historial para retomarlo (`git show 4fcab11`).

- [ ] Agregar toasts para confirmar acciones (abono registrado, apartado,
      liquidado, etc.) en lugar de `alert()`.

## Detalles chicos

- [ ] Revisar si otras páginas con estados vacíos muestran "No hay…" por un
      momento mientras cargan (en `clients/[id]` ya se corrigió).
- [ ] `add-client-modal.tsx`: typo `cursor-ointer` en "Cancelar".
- [ ] Asteriscos de campo obligatorio en `text-red-500` (add-client,
      add-product, add/edit-supplier); `add-payment-modal.tsx` ya usa
      `text-my-red`.

---

## Completado

### 2026-09-28
- [x] Caja registradora: productos y carrito con la misma altura (la de la
      pantalla) y scroll interno en cada uno; búsqueda, encabezado del
      carrito y totales siempre visibles.
- [x] Proveedores: 3 highlights (Total de Proveedores, Proveedor con más
      artículos en tienda, Más ventas en {mes} por monto) con
      `GET /api/suppliers/sales`. Las ventas sólo cuentan liquidaciones
      mientras la caja no guarde ventas.
- [x] Clientes con el mismo layout y colores que Proveedores: búsqueda y
      "Agregar Cliente" en la línea del título (el buscador ya sin colores
      crudos), saldo total en verde, misma cuadrícula de tarjetas.
- [x] Modal de detalle de producto: el badge del encabezado dice "Apartado"
      (naranja) cuando todas las unidades están apartadas.
- [x] Inventario → Servicios: ocultar Estado, Cantidad y Apartados; en su
      lugar, columna "Registrar" con botón deshabilitado ("Próximamente").
- [x] Inventario → Productos: no mostrar "Disponible" si todas las unidades
      están apartadas; queda sólo el badge "N Apartado(s)".
- [x] Inventario → filtro "Disponible": sólo incluye productos con al menos
      una unidad libre (antes usaba `Product.status`, que no ve reservas).
- [x] `client-card.tsx`: el punto verde de "tiene saldo" usa `bg-my-green`
      (antes `bg-green-500`).
- [x] Limpieza de datos de prueba: Teresa y Andrea con saldo $0, sin
      apartados, abonos ni ventas (inventario sin tocar). Respaldo en JSON
      en la carpeta temporal de esa sesión.

### 2026-09-25
- [x] Pie de la cuenta del cliente en renglones separados: Total apartado,
      Abonado, Falta por pagar (rojo si > 0) y "Le sobran" sólo si abonó de
      más. Se quitó el resta corriente de cada renglón del historial
      (confundía).
- [x] Al apartar desde la pantalla del cliente, el historial se actualiza al
      momento (antes sólo se recargaba la tarjeta).

### 2026-09-24
- [x] Migración `layaway_item_history`: los apartados ya no se borran; tienen
      estado (Activo / Liquidado / Cancelado), fecha y venta ligada. Todos
      los conteos de reservas filtran por `status = "Activo"`.
- [x] Historial del cliente como la lista en papel: apartados, abonos,
      ventas discretas y cancelados tachados, lo más reciente abajo.
      (Liquidar ya se probó en la app: sale "Vendido: …" en gris.)
- [x] Cancelar un apartado desde la tarjeta (✕ al pasar el mouse) con
      diálogo de confirmación.
- [x] Selección múltiple de apartados limitada por el saldo, con "Abono
      Completo" para liquidar lo seleccionado; verde en lo que alcanza.
- [x] Loaders por tarjeta en `clients/[id]` y scroll interno en ambas
      columnas.
- [x] Modales "Agregar Abono" y "Apartar Producto" rediseñados con el mismo
      esquema que los demás; "Apartar Producto" con filtro por proveedor,
      máximo 4 filas visibles y unidades libres reales.
