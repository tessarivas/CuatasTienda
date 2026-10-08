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
- [ ] Pedidos de servicio (#37): crear uno con anticipo, registrar otro
      anticipo, imprimir ticket y "Exportar PDF", editarlo, entregar cobrando lo
      que resta (venta en el Historial; en el Corte cada pago en su día, sin
      contar doble) y cancelar otro con anticipo (devolver y quedarse).
      Marcar algún servicio "Se hace por pedido" y revisar "Letras del
      folio" en Editar proveedor.
- [ ] Promociones (#34): crear una vigente en un proveedor, ver el precio
      tachado en la caja, cobrar (en el ticket dice "Promoción") y revisar el
      corte del proveedor; poner un descuento manual encima (debe
      reemplazarla); una de "sólo algunos productos" (sólo esos se rebajan);
      intentar una que encime un mismo producto (no debe dejar); terminarla.
- [ ] Devolver saldo excedente (#36): con un cliente que abonó más de lo
      apartado, "Devolver" junto a "Le sobran"; revisar que baje su saldo,
      salga en su historial y estado de cuenta, y que en el Corte de Caja
      reste de la caja de apartados (efectivo) o de banco.

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

## Corte de Caja y comprobantes: lo que falta

Ya están hechos (ver Completado). Quedan:

- [ ] Restar los gastos en efectivo del esperado en caja cuando exista el
      módulo de gastos (decidir de cuál caja salen: principal o apartados).

## Etiquetas con código de barras para imprimir (#35)

Cada producto ya tiene un código único al crearse (`Product.code`,
letras del proveedor + 8 al azar, p. ej. `CU-PAV6ANCG`) y la caja ya busca por código. Lo que
falta es poder **imprimirlo como código de barras** para pegarlo en la
mercancía, sin salir de la app.

- [ ] Generar un PDF de etiquetas (reusar `product-label.tsx`) listo para la impresora, para
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

## Completado

### 2026-10-08
- [x] Etiqueta con código de barras en el detalle del producto (#35, primera
      parte): código de barras real (Code 128 con JsBarcode), el número
      del código, y proveedor y precio (`dashboard/_components/product-label.tsx`).
      Falta exportar/imprimir etiquetas.
- [x] El código del producto empieza con las letras del proveedor (las de
      sus pedidos de servicio) + 8 al azar: `CU-PAV6ANCG`. Los 16 productos
      que había se cambiaron de `CT-` (misma parte al azar).
- [x] Promociones por proveedor (#34): tarjeta "Promociones" en la página
      del proveedor (porcentaje o pesos por pieza, a todos sus productos o
      sólo a algunos, de tal a tal fecha, un producto en una sola a la vez,
      programar y terminar). La caja la aplica sola (precio tachado,
      "Promo" en el carrito y "Promoción" en el ticket); el descuento manual
      la reemplaza; no aplica a apartados ni pedidos de servicio. Migración
      `supplier_promotions`.

### 2026-10-07
- [x] Pedidos de servicio (#37): servicios por pedido con nombre y teléfono
      del cliente, varios servicios con su descripción y precio, folio por
      letras del proveedor (CO-001), "Por entregar" hasta que se entrega y
      cobra (ahí se crea la venta). Ticket de 58 mm y "Exportar PDF" (hoja carta). Página
      "Pedidos de servicio", botón "Registrar" del inventario, "Se hace por
      pedido" en cada servicio, "Letras del folio" en el proveedor y aviso en
      Pendientes del inicio. Anticipos parciales o completos (cuentan en la
      caja principal el día que se reciben; la venta se crea al quedar
      pagado completo); al cancelar con anticipo se pregunta si se devuelve.
      Migraciones `service_orders` y `service_order_payments`.
- [x] Borrar producto para siempre (#6): dentro del diálogo de "Eliminar
      producto", sólo si no tiene ventas, apartados ni movimientos; pide
      escribir el nombre. Borra también su foto en Cloudinary. Se corrigió
      el texto del diálogo, que decía "permanente" para un retiro.
- [x] Devolver saldo a favor (#36): botón "Devolver" junto a "Le sobran" en
      la cuenta del cliente. Sólo lo que sobra de sus apartados; queda en el
      historial (naranja) y en el estado de cuenta; en el corte resta de la
      caja de apartados (efectivo) o de banco. Migración `payment_kind`.

### 2026-10-05
- [x] Ticket para la impresora EC Line EC-PM-58110 (58 mm) (#39): un solo
      componente (`dashboard/_components/ticket.tsx`) que es la vista previa
      y lo que se imprime (`lib/print-ticket.ts`, iframe con hoja de 58 mm
      por el alto del ticket). En "¡Venta completada!" con botón "Imprimir
      ticket" (no se imprime solo), "Reimprimir ticket" en el Historial de
      Ventas, y comprobante de abono (con la cuenta al imprimir) desde el
      historial del cliente. Pie: "¡Gracias por su compra!".
- [x] Loader al apartar desde Inventario: el botón del cliente elegido dice
      "Apartando..." con loader, el modal no se cierra hasta que se guarda
      (y se queda abierto si falla). Encabezado con icono y el producto.
- [x] "Guardar y agregar otro" en el modal de agregar producto/servicio
      (#38): guarda y deja el modal abierto, limpio y con el mismo
      proveedor, con el cursor en Título; Enter hace lo mismo. Leyenda gris
      "N productos agregados en esta tanda"; "Cancelar" pasa a "Terminar".
      El precio arranca vacío en vez de 0.
- [x] Historial de movimientos del proveedor (#16): tabla debajo de Corte
      Mensual y Productos en `suppliers/[id]`, con altas, retiros y ventas
      desglosadas (folio, origen, método, monto, quién registró), filtros
      por tipo, producto y fechas, e incluye productos retirados.
      `GET /api/suppliers/[id]/movements`. El alta inicial de cada producto
      se reconstruye (hoy + vendidas + retiradas − altas), porque crear un
      producto no escribe un StockMovement.
- [x] PDF de existencias por proveedor (#31): botón "Existencias" en la
      tarjeta Productos, con el periodo que se ve en Corte Mensual.
      `GET /api/suppliers/[id]/stock-report`. Lo que sigue en existencia
      sale siempre; lo vendido, sólo si fue en el periodo; retirados en
      gris; sin servicios; se omite lo que no tiene existencia ni ventas.
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
