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
      **personalizados** con descripción y precio propios. Ya no está
      bloqueado: puede registrarse como venta con `POST /api/sales`. Los
      servicios personalizados (precio propio, sin estar en catálogo)
      necesitarán decidir cómo se guardan, porque hoy `SaleItem` apunta a un
      producto existente.

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

## Gastos de la tienda

Hoy los gastos del negocio que no son de proveedores (p. ej. luz, renta,
limpieza, papelería, comida, gasolina, un pago a alguien que ayudó) nunca
quedan registrados. Un módulo sencillo para anotarlos al momento.

- [ ] Migración: tabla `Expense` — fecha, monto, concepto/descripción,
      categoría, método de pago (efectivo / tarjeta / transferencia), quién
      lo registró (de la sesión, como `receivedBy` en abonos) y comprobante
      opcional (Cloudinary, como los comprobantes de pago).
- [ ] Pantalla de gastos con el layout de las páginas de lista: periodo,
      tarjetas de resumen (total del periodo, por categoría o por método),
      tabla y botón "Registrar gasto" (modal).
- [ ] Integrarlo al **Corte de Caja**: lo que se pagó en efectivo sale de la
      caja, así que el efectivo esperado = ventas en efectivo + abonos en
      efectivo − gastos en efectivo.
- [ ] Decidir antes de construirlo:
  - Categorías: ¿una lista fija (p. ej. Servicios, Renta, Insumos, Comida,
    Transporte, Otro) o que se puedan crear desde la app?
  - ¿Se separan los gastos de la tienda de los personales/familiares, o
    todo es "gasto" con su categoría?
  - ¿Quién puede registrar y borrar gastos? (Hoy cualquier usuario puede
    todo; ver roles en `CLAUDE.md`.)

## Promociones por proveedor (descuento por periodo)

Desde la página del proveedor, definir un descuento para **todos sus
productos** durante un periodo (fecha de inicio y fin), por **porcentaje** o
**cantidad fija**. Mientras esté vigente, la caja lo aplica sola.

- [ ] Migración: tabla nueva (p. ej. `SupplierDiscount`: proveedor, tipo
      `percentage`/`fixed`, valor, `startsAt`, `endsAt`, activa).
- [ ] UI en `suppliers/[id]`: crear, ver y cancelar la promoción vigente o
      programada (¿una tarjeta propia, o dentro de "Corte Mensual"?).
- [ ] `POST /api/sales` debe aplicarla del lado del servidor (no confiar en
      la pantalla) y guardarla en `SaleItem.discount`, para que el corte del
      proveedor ya salga con el descuento.
- [ ] Decidir antes de construirlo:
  - "Cantidad fija": ¿es por pieza ($20 menos en cada producto) o por
    ticket?
  - ¿Se puede sumar con el descuento manual por producto de la caja, o uno
    reemplaza al otro (p. ej. gana el mayor)?
  - ¿Aplica también a la liquidación de apartados? Esos ya tienen el precio
    pactado al apartar (`LayawayItem.price`), así que lo natural sería que
    no.
  - ¿Pueden empalmarse dos promociones del mismo proveedor?
  - Mostrarlo en la caja: precio tachado o etiqueta "Promo" en la tarjeta y
    en el carrito.

## Comprobantes de pago (tarjeta / transferencia)

Cuando un cobro es con **Tarjeta** o **Transferencia**, poder adjuntar el
comprobante (foto del voucher o captura de la transferencia) y guardarlo
ligado a ese cobro, para consultarlo después.

**Se piden en el Corte de Caja, no al cobrar.** La caja registradora y los
modales de abono no cambian: cobrar sigue siendo rápido. Al hacer el corte,
se listan los cobros del periodo con tarjeta/transferencia y ahí se adjunta
el comprobante de cada uno (y se ve cuáles faltan).

Cobros que entran a esa lista:
- Ventas de caja (`Sale.paymentMethod`).
- Abonos a clientes (`Payment.method`), incluido el abono que genera
  "Liquidar Cuenta" al cobrar lo faltante.

Depende de que exista la pantalla de Corte de Caja (sección "Caja
registradora").

- [ ] Guardar el archivo en Cloudinary, como las fotos de productos y
      logos (`lib/cloudinary/`), con un id determinista por cobro (p. ej.
      `comprobantes/ventas/{folio}` y `comprobantes/abonos/{paymentId}`).
- [ ] Migración: columna para la URL del comprobante en `Sale` y en
      `Payment` (nullable — en efectivo no aplica).
- **Decidido:** el corte **se puede cerrar con comprobantes faltantes**;
  esos cobros quedan marcados como **pendientes** y se pueden completar
  después (p. ej. cuando el cliente manda la captura más tarde).
- [ ] Mostrar los comprobantes pendientes de cortes anteriores (un aviso o
      lista) para que no se olviden.
- [ ] Dónde más se consulta: en el historial del cliente (abonos) y en el
      futuro Historial de Ventas (ventas de caja).

## Etiquetas con código de barras para imprimir

Cada producto ya tiene un código único al crearse (`Product.code`,
`CT-XXXXXXXX`; hoy los 11 lo tienen) y la caja ya busca por código. Lo que
falta es poder **imprimirlo como código de barras** para pegarlo en la
mercancía, sin salir de la app.

- [ ] Generar la imagen del código de barras a partir de `Product.code`
      (Code 128 lee letras y guiones, así que el formato actual sirve tal
      cual). Verlo en el detalle del producto.
- [ ] Generar un PDF de etiquetas listo para la impresora de etiquetas, para
      un grupo de productos — p. ej. "los registrados hoy" (por
      `createdAt`) o los de un proveedor — y mandarlo a imprimir desde la
      app.
- [ ] Decidir antes de construirlo:
  - Modelo de impresora y **medida de la etiqueta** (p. ej. 50×25 mm), para
    armar el PDF a ese tamaño exacto.
  - Qué lleva cada etiqueta además del código: ¿título, precio, proveedor?
  - ¿Una etiqueta por producto o una por unidad (si entran 10 piezas, 10
    etiquetas)?
  - Productos que reciben más unidades después ("Agregar unidades"):
    ¿también se les imprimen etiquetas para las piezas nuevas?
- [ ] Confirmar que el lector de la caja lee bien la etiqueta impresa (el
      buscador de la caja ya acepta el código).

## Inventario: filtro de estatus se cuela a Servicios (bug)

- [ ] En Productos se elige un estatus (p. ej. "Con apartados"), se cambia a
      la pestaña Servicios y no sale ningún servicio: el filtro sigue activo
      aunque en Servicios no se muestra. Los servicios no tienen estatus, así
      que no deben filtrarse por él. Causa: `applyFilters` en
      `inventory/page.tsx` aplica `statusFilter` a ambas pestañas; debe
      aplicarlo sólo a productos (o ignorarlo en Servicios), sin perder la
      selección al regresar a Productos.

## Caja registradora (POS)

- [ ] Probar una venta real en la caja: el modal debe mostrar el folio
      `DDMMYY-001` y el stock bajar; probar también una con descuento total
      (un solo proveedor).
- [ ] Pantalla "Corte de Caja" (en el menú sigue apuntando a `#`). Ahí se
      piden los comprobantes (ver sección de comprobantes).

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

### 2026-10-01
- [x] **Historial de Ventas** (`/admin/dashboard/sales`, enlazado en el
      menú): periodo (hoy, ayer, semana, mes, rango), tarjetas de ventas /
      total / más vendido y desglose Efectivo / Banco / Apartados, filtros de método y origen, búsqueda por folio o
      producto, y el ticket completo al dar clic. `GET /api/sales?from&to`.
      El encabezado de la app ahora reconoce subsecciones del menú.
- [x] Primera venta de caja guardada y verificada: `011026-003` (después
      de las liquidaciones `-001` y `-002`, mismo consecutivo).
- [x] **La caja guarda las ventas** (migración `sale_folio_and_pos`,
      aplicada): `POST /api/sales` recalcula precios, valida stock libre,
      descuenta inventario y genera folio `DDMMYY-NNN` (hora del Pacífico,
      consecutivo diario compartido con las liquidaciones). Descuento al
      total sólo con un proveedor (UI con tooltip + validación en servidor).
      "Más ventas en {mes}" ya cuenta la caja con cantidades y descuentos.
- [x] Carrito: proveedor en pequeño en cada artículo y nombres largos
      cortados con "…" (arreglo del `ScrollArea`).
- [x] Modales de descuento y método de pago con ícono en el encabezado, sin
      fondos grises y con la mitad de espacio entre métodos de pago. La caja
      ya no usa verdes de Tailwind (todo `text-my-green-dark`).
- [x] Caja: filtros como en inventario (búsqueda, ordenar, proveedor por
      nombre — antes "Proveedor 9" — y tipo Productos/Servicios en lugar de
      estatus). Tarjetas homogéneas: stock libre en la esquina de la foto
      (rojo con 5 o menos), ícono de herramienta en servicios, título de
      alto fijo a 2 renglones con "…" para que el precio quede alineado.
- [x] Botón "Liquidar Cuenta" (outline) en Productos Apartados, con diálogo
      que muestra Total apartado / Abonado / A cobrar y pide el método si
      falta dinero. El abono por lo que falta y la liquidación de todo van
      en una sola transacción (`payShortfall` en el endpoint de liquidar).
      Probado en la app; issue #18 cerrado.
- [x] Corregido: al liquidar varias unidades del mismo producto, el stock
      bajaba sólo 1 (servidor y pantalla).
- [x] Eliminar cliente (#9): sólo si no tiene historial (abonos, apartados
      ni ventas); con historial, 409 con mensaje claro. Se hace desde el
      botón "Editar" del encabezado de `clients/[id]`, que abre
      `edit-client-modal.tsx` (Nombre, Teléfono y "Eliminar", mismo patrón
      que Editar Proveedor); el diálogo confirma (rojo) o explica por qué no
      se puede. Probado en la app; issue #9 cerrado.
- [x] Merge de la rama a `main` (prioridad a la rama) y 7 issues cerrados en
      GitHub (#2, #21, #24, #26, #27, #28, #30).

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
