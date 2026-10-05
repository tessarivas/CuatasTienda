# Pendientes

Lista viva de trabajo acordado. Arriba va lo pendiente (`- [ ]`); cuando algo
se termina se marca `- [x]` y se mueve a la sección **Completado** al final,
con la fecha, para que se vea de un vistazo qué ya está listo.

## Pruebas pendientes en la app

Cosas ya construidas que falta probar a mano (sin issue en GitHub):

- [ ] Cancelar un apartado con la ✕ de la tarjeta: debe salir tachado en el
      historial, bajar "Falta por pagar" y la unidad volver a estar
      disponible en inventario.
- [ ] Corte de Caja: cerrar el corte de hoy, corregirlo, y adjuntar un
      comprobante a una venta o abono con tarjeta/transferencia (y verlo
      después en el ticket del Historial de Ventas).
- [ ] Caja: una venta con descuento al total (un solo proveedor). La venta
      normal ya se probó (`011026-003`).
- [ ] Descargar desde la app los PDF de corte de caja, historial de ventas
      y estado de cuenta del cliente.
- [ ] Fecha de apartado en las tarjetas y clip de comprobante en el
      historial del cliente.

## Historial de movimientos por proveedor (#16)

**Objetivo:** una sección donde se vean todas las altas y retiros de
inventario de los productos de un proveedor — la bitácora que hoy sólo vive
en la base de datos — **y también sus ventas, desglosadas**.

**Decidido (2026-10-02):** va en `suppliers/[id]`, como una tabla **debajo de
las dos columnas** (Corte Mensual y lista de Productos). Renglones de tres
tipos: alta de productos (qué día y cuántos), retiro, y venta (folio, producto,
cantidad, precio).

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
- [ ] Juntar en una sola lista `StockMovement` (altas/retiros) y
      `SaleItem` (ventas) de los productos del proveedor, por fecha.
- [ ] La tabla debajo de las dos columnas de `suppliers/[id]/page.tsx`.
- [ ] Filtros razonables: por tipo (Alta/Retiro/Venta), rango de fechas,
      producto.
- [ ] Columnas: fecha, producto, tipo, cantidad, motivo, quién lo registró,
      y "Recogido por" cuando aplique; en ventas, folio y monto.
- [ ] **Los productos retirados (soft-delete) deben seguir apareciendo en
      este historial.** Hoy el catálogo, el POS y "Ver todos" de inventario
      excluyen productos con `status = "Retirado"` — eso está bien y no se
      toca. Pero la consulta de movimientos para este historial **no** debe
      filtrar por `status`, o los retiros de productos ya eliminados
      desaparecerían del registro. El historial es la única vista pensada
      para ser la excepción a esa regla.

## Cliente: cómo se lleva la cuenta (`clients/[id]`, referencia)

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


## Saldo a favor del cliente: qué pasa con lo que sobra (#36)

Un cliente puede quedar sin apartados pero con saldo positivo (el pie lo
muestra como "Le sobran $X"). Hoy ese saldo se queda ahí indefinidamente.

- [ ] Revisar qué debe pasar con ese saldo: ¿se queda como crédito para
      futuros apartados, se le devuelve al cliente, o ambas?
- [ ] Opción de **limpiar / vaciar saldo** en `clients/[id]`. Ojo: no debe
      ser sólo poner `currentBalance` en 0 — tiene que dejar un movimiento en
      el historial (p. ej. "Devolución de saldo", con quién la hizo y
      cuándo), o el historial deja de cuadrar contra el total.

## Inventario

- [ ] **Servicios → darle funcionalidad al botón "Registrar"** (#37) (hoy está
      deshabilitado a propósito, "Próximamente"): anotar que se hizo un
      servicio (p. ej. una copia, un acta), incluyendo servicios
      **personalizados** con descripción y precio propios. Ya no está
      bloqueado: puede registrarse como venta con `POST /api/sales`. Los
      servicios personalizados (precio propio, sin estar en catálogo)
      necesitarán decidir cómo se guardan, porque hoy `SaleItem` apunta a un
      producto existente.

## Eliminar producto: separar "retirar" (ya existe) de "eliminar permanentemente" (no existe) (#6)

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

## Gastos de la tienda (#33)

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

## Promociones por proveedor (descuento por periodo) (#34)

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

## Corte de Caja y comprobantes: lo que falta

Ya están hechos (ver Completado). Quedan:

- [ ] Restar los gastos en efectivo del esperado en caja cuando exista el
      módulo de gastos (decidir de cuál caja salen: principal o apartados).

## Reporte PDF de existencias por proveedor (#31)

Los proveedores a veces necesitan saber qué tienen en tienda y en qué estado,
más allá del corte. Un PDF (mismo formato de `lib/pdf/report-layout.tsx`) con
todos sus productos:

- **Lo que sigue en existencia sale siempre**, sin importar cuándo se dio de
  alta. Ej.: 20 artículos en abril + 20 en mayo, se vendieron 10; al cerrar
  mayo siguen apareciendo los 30 que quedan, aunque vengan de un corte
  anterior.
- **Lo vendido sólo sale si se vendió dentro del periodo de corte** (el
  actual o el elegido). Lo vendido en un corte pasado ya se le entregó al
  proveedor, así que ya no aparece.
- Por producto: existencia, disponibles, apartados y vendidos en el periodo,
  con su estado (Disponible / Apartado / Vendido).

- [ ] Endpoint (o ampliar `GET /api/suppliers/[id]/cutoff`) que junte la
      existencia actual (`quantity`, apartados activos) con lo vendido en el
      periodo (`SaleItem` dentro del rango).
- [ ] PDF y botón "Exportar existencias" en `suppliers/[id]` (tarjeta
      Productos, con `CardActionButton`).

Decidido (2026-10-02):
- **Los productos retirados sí salen** (con estado "Retirado"), en este y en
  los demás PDF.
- **Los servicios no salen** en este reporte (no tienen existencia). Sí deben
  contar, con su cantidad, en los cortes (el corte mensual ya suma sus
  ventas; confirmarlo al construir esto).
- **Se omite** un producto sin existencia y sin ventas en el periodo.
- **El periodo es el del corte mensual, pero personalizable**: hay
  proveedoras que vienen cada 15 días o cada 3 semanas, sin patrón fijo. Usar
  el mismo selector de Inicio/Fin del Corte Mensual (por defecto, el periodo
  en curso).

## Etiquetas con código de barras para imprimir (#35)

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

## Formato de ticket (impresora de tickets y vista en pantalla) (#39)

Un solo formato de ticket de venta que sirva para dos cosas:

- [ ] **Versión para imprimir en la impresora de tickets** (papel térmico
      angosto): datos de la tienda (`lib/store-info.ts`), folio, fecha y
      hora, productos con cantidad y precio, descuentos, total, método de
      pago y quién atendió.
- [ ] **Usar esa misma vista como simulación del ticket** en los modales
      donde hoy se ve una venta (p. ej. el ticket del Historial de Ventas y
      el de venta completada en la caja), para que lo que se ve en pantalla
      sea igual a lo que se imprime.
- [ ] Decidir antes de construirlo: modelo de impresora y ancho del papel
      (58 mm u 80 mm); si se imprime desde el navegador (`window.print()`
      con CSS de impresión) o con otro método; si se imprime solo al cobrar
      o con un botón.

## Agregar producto: "guardar y agregar otro" (a contemplar) (#38)

Del issue #25 (cerrado): poder dar de alta varios productos seguidos sin que
`add-product-modal.tsx` se cierre al guardar — p. ej. un botón "Guardar y
agregar otro" que limpia los campos y conserva el proveedor. Útil cuando
llega mercancía nueva de un proveedor. Sólo para contemplar después.

---

## Completado

### 2026-10-05
- [x] Toasts en lugar de `alert()` (#32): base SmoothUI "Basic Toast"
      adaptada a los tokens `my-*` y a una pila (`lib/toast.ts` +
      `<Toaster />` en el layout raíz). Los 56 `alert()` pasaron a
      `toast.error` / `toast.warning`, y las acciones principales confirman
      con `toast.success` (abono, apartado, liquidación, cancelación, corte,
      comprobante, altas/ediciones/bajas de clientes, proveedores y
      productos, movimientos de stock). Aviso de comprobantes pendientes de
      días anteriores al entrar al panel, una vez por sesión
      (`GET /api/receipts/pending`).
- [x] Página 404 (`app/not-found.tsx`, #40): logo, "No encontramos esta
      página", botones Regresar e Ir al inicio. Se ve fuera del panel (sin
      sidebar).

### 2026-10-02
- [x] **Página de inicio** (antes vacía): saludo, Vendido hoy / Apartados
      activos / En tienda, gráfica de ventas de 7/14/30 días por destino del
      dinero con anillos, Pendientes (corte de hoy, comprobantes, cortes de
      proveedor con su PDF, clientes que pueden liquidar, por agotarse),
      actividad reciente y más vendidos. `GET /api/dashboard`.
- [x] Bug: el filtro de estatus de Productos ya no vacía la pestaña
      Servicios (se ignora ahí y se conserva al regresar a Productos).
- [x] Fecha de apartado en las tarjetas de Productos Apartados ("Apartado el
      1 oct"; con unidades de días distintos, "Desde el …" y el tooltip con
      todas las fechas).
- [x] Ver el comprobante de un abono desde el historial del cliente (clip
      junto al monto, sólo si tiene comprobante).
- [x] Detalles chicos: typo `cursor-ointer`, asteriscos en `text-my-red`, y
      el modal "Apartar Producto" muestra "Cargando productos..." en vez de
      "No hay productos disponibles" mientras cargan (las demás páginas ya
      esperaban a sus datos).
- [x] Reportes PDF de corte de caja, historial de ventas y estado de cuenta
      del cliente, con el mismo formato que el del proveedor. Botón
      "Exportar" en cada página (en el cliente, en la tarjeta Historial de
      Movimientos). El de ventas lleva lo que muestra la tabla, con los
      filtros anotados; el de caja, lo que se ve en pantalla aunque el corte
      siga abierto.
- [x] Issue #14 cerrado: sólo PDF, sin CSV.
- [x] Reporte PDF del corte de proveedor ("Exportar Reporte" en Corte
      Mensual): resumen, ventas por producto, detalle de cada venta y firmas
      Entregó / Recibió. Formato compartido en `lib/pdf/report-layout.tsx`
      y datos de la tienda en `lib/store-info.ts`.
- [x] **Corte Mensual por proveedor con datos reales** (antes eran números
      inventados): total vendido (= ganancia del proveedor, la tienda no
      cobra comisión), productos disponibles y piezas vendidas. Por defecto,
      el periodo en curso; con Inicio/Fin + "Actualizar Datos", cualquier
      rango. `GET /api/suppliers/[id]/cutoff`, reglas en
      `lib/suppliers/cutoff.ts`.
- [x] Día de corte por defecto = día de alta del proveedor (nuevos al
      crearse; Compuservi quedó en 16 por migración de datos). Cuatas
      conserva su 15. Probado en la app (Full Moons, alta hoy, quedó en
      día 2); issue #23 cerrado.

### 2026-10-01
- [x] Corte de Caja por ventana: cubre desde el cierre anterior hasta el
      cierre (lo cobrado después de cerrar entra solo al corte siguiente,
      con aviso). Sólo se cierra el de hoy; cualquiera se corrige.
      Migración `cash_closing_period`.
- [x] "Cortes anteriores": tabla con fecha, esperado, contado, diferencia,
      comprobantes pendientes y quién cerró; clic para abrir ese corte.
- [x] Caja de apartados aparte: los abonos en efectivo se muestran en su
      propio renglón y ya no suman al esperado de la caja principal.
- [x] Leyendas del corte en gris y sin rayas largas.
- [x] **Corte de Caja** (`/admin/dashboard/cash-closing`, enlazado en el
      menú): uno por día (hora del Pacífico), fondo inicial editable ($200
      por defecto), ventas y abonos en efectivo, esperado vs. contado y
      diferencia (faltante/sobrante), notas, "Cerrar corte" y corrección
      posterior (es de admin). Tabla `CashClosing` (migración
      `cash_closing_and_receipts`).
- [x] **Comprobantes de pago** (sólo imágenes, en Cloudinary
      `comprobantes/ventas/{folio}` y `comprobantes/abonos/{id}`): se
      adjuntan o reemplazan desde el corte, también ya cerrado; el corte
      marca cuántos faltan. En el ticket del Historial de Ventas aparece
      "Ver comprobante adjunto".
- [x] Fecha de hoy en los títulos de Historial de Ventas y Corte de Caja
      (como Inventario), calculada en el navegador para no desfasarse con el
      servidor en UTC (`hooks/use-today-label.ts`).
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
