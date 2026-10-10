# Cuatas Tienda

Documento de contexto para diseñar la **landing page de la versión 2**: una vitrina pública
de la tienda (quiénes somos, qué vendemos, dónde estamos) **antes de ser e-commerce**. Aquí
no se compra en línea: la página muestra productos y servicios e invita a visitar, llamar o
escribir.

---

## 1. Qué es Cuatas Tienda

Una tienda física pequeña en **San Quintín, Baja California, México**. Funciona a
**consignación**: varios proveedores rentan espacio en los anaqueles y la tienda vende sus
productos. La tienda no cobra comisión; a cada proveedor se le entrega lo vendido en su corte
mensual.

Lo que se vende hoy:

- **Productos** de varios proveedores: papelería (cuadernos, lápices, plumas), accesorios de
  computación (mouse, periféricos, usados y nuevos) y otros artículos de los proveedores.
- **Servicios rápidos**, cobrados en caja: copias en blanco y negro y a color, impresión de
  actas de nacimiento.
- **Servicios por pedido**, que se dejan y se recogen después: mantenimiento de computadoras,
  instalación de software (p. ej. Office). Se puede dejar un **anticipo** y pagar el resto al
  recoger.
- **Apartados**: el cliente aparta uno o varios productos y los va pagando con **abonos**.
  Cuando completa el pago, se los lleva. Es una costumbre muy de la zona y un buen gancho para
  la página.
- **Promociones por proveedor**: descuentos por temporada (porcentaje o pesos por pieza).

### Proveedores (marcas dentro de la tienda)

| Proveedor | Qué ofrece |
|---|---|
| **Cuatas** | La marca de la casa: papelería y servicios rápidos (copias, actas). |
| **Compuservi** | Computación: accesorios, mantenimiento e instalación de software. |

Cada proveedor tiene su logo. Se puede mostrar una sección de "Marcas en la tienda".

---

## 2. Datos de la tienda

| | |
|---|---|
| Nombre | **Cuatas Tienda** |
| Dirección | Carretera Transpeninsular #1067, San Quintín, B.C., México 22940 |
| Teléfono | 616 159 9954 |
| Correo | cuatas.tienda@gmail.com |
| Zona horaria | Pacífico (America/Tijuana) |
| Horario | Lunes a sábado de 8:00 a.m. a 5:00 p.m. · Domingo de 10:00 a.m. a 2:00 p.m. |
| Redes sociales | @cuatastienda |
| WhatsApp | 616 159 9954 (el mismo teléfono) |

---

## 3. Identidad visual

### Logo

- `public/LOGO_CUATAS.svg` (vector) y `public/LOGO_CUATAS.png` (PNG).
- Una **"C" negra gruesa** con una **flama de colores** en degradado (verde, amarillo,
  naranja, rojo). Es la única pieza muy colorida; el resto de la marca es sobria.

### Colores

La base es **blanco y negro casi puro** (tono "stone", ligeramente cálido). El color se usa
en acentos, etiquetas y tarjetas destacadas, nunca de fondo en toda la página.

| Rol | Hex / valor |
|---|---|
| Fondo | `#FFFFFF` |
| Texto y botón principal | casi negro cálido, `oklch(0.216 0.006 56)` (≈ `#1C1917`) |
| Texto secundario | gris cálido (stone 500 aprox.) |

Paleta de acentos. Cada color tiene tres tonos: el **light** de fondo y el **dark** de texto
encima, para etiquetas y tarjetas.

| Color | Base | Light (fondo) | Dark (texto) |
|---|---|---|---|
| Azul | `#3185FC` | `#ADCEFE` | `#29457E` |
| Amarillo | `#FFE629` | `#FFF5A9` | `#907614` |
| Rojo | `#FE5E41` | `#FFBFB3` | `#903220` |
| Verde | `#25D366` | `#BAF3CF` | `#1F6E3B` |
| Naranja | `#FF9F1C` | `#FFDDAD` | `#835516` |
| Morado | `#9B5DE5` | `#D7BEF5` | `#512682` |
| Rosa | `#F15CAD` | `#F9BDD8` | `#84255A` |

Cómo se usan en el panel actual (para que la landing se sienta de la misma familia):

- **Etiquetas de estado**: fondo light + texto dark (p. ej. "Disponible" en verde).
- **Tarjetas destacadas**: bloques redondeados con fondo light y número grande en dark.
- Nunca texto en el tono base sobre blanco (no se lee bien); para texto, el dark.
- El verde `#25D366` coincide con el de WhatsApp, útil si el botón de contacto es por WhatsApp.

### Tipografía y formas

- **Inter** (Google Fonts), en todo.
- Títulos en negrita, sin mayúsculas forzadas.
- Bordes redondeados: base `0.625rem` (10 px). Tarjetas `rounded-xl`, fotos de producto más
  redondeadas (`rounded-3xl`).
- Iconos de línea: **Lucide**.
- Estilo general: limpio, mucho blanco, sombras muy suaves, botones negros sólidos o con
  contorno.

### Tono de los textos

- Español de México, de **tú**, con palabras cotidianas de tienda ("apartar", "abonar",
  "pasa por él"). Nada de términos técnicos.
- Frases cortas. **Sin guiones largos (—)** en los textos visibles.
- Leyendas y notas en gris, nunca en color.

### Design system del panel (cómo están hechas las piezas)

Valores reales del panel actual, para que la landing se sienta de la misma familia.

**Neutrales** (todos con un toque cálido):

| Token | Valor | Uso |
|---|---|---|
| `--background` | `oklch(1 0 0)` (blanco) | fondo de página |
| `--foreground` | `oklch(0.147 0.004 49)` (≈ `#0C0A09`) | texto principal |
| `--primary` | `oklch(0.216 0.006 56)` (≈ `#1C1917`) | botón principal, elemento activo |
| `--muted` / `--secondary` | `oklch(0.97 0.001 106)` (≈ `#F5F5F4`) | fondos suaves, círculos de iconos, chips |
| `--muted-foreground` | `oklch(0.553 0.013 58)` (≈ `#78716C`) | leyendas, fechas, notas |
| `--border` | `oklch(0.923 0.003 49)` (≈ `#E7E5E4`) | bordes de tarjetas y campos |
| `--destructive` | `oklch(0.577 0.245 27)` (rojo) | sólo acciones de borrar |

Existe modo oscuro en el panel, pero el uso diario es en claro. Para la landing, diseñar en
claro.

**Espaciado y medidas**

- Página: margen de 16 px en celular (`p-4`); bloques separados por 16 px (`space-y-4`).
- Tarjetas: separación interna de 24 px (`py-6 px-6`) y 24 px entre sus partes.
- Rejillas: 16 px de separación (`gap-4`); en celular 12 px en carruseles.
- Alturas: botones y campos de 36 px (`h-9`); botón chico 32 px; botón grande 40 px.

**Tarjeta (`Card`)**

- Fondo blanco, borde de 1 px `--border`, esquinas de 12 px (`rounded-xl`), sombra muy leve
  (`shadow-sm`).
- Encabezado: **icono de línea de 20 px + título** (18 px, semibold) en un renglón; a la
  derecha, opcional, un contador gris en píldora o un botón con contorno.
- Leyenda bajo el título en gris, 14 px.

**Tarjeta destacada (`StatCard`)**

- Bloque sin borde, esquinas de 12 px, relleno de 20 px, fondo **light** de un color de marca y
  todo el texto en el **dark** del mismo color.
- Arriba: icono de 16 px + título (14 px, medium). En medio: el valor grande (24 px, bold). Abajo:
  una pista corta (12 px, 75 % de opacidad).
- Van de tres en tres. Orden de colores: amarillo, azul, verde (o rosa). En celular, carrusel de
  una fila con cada tarjeta al 80 % del ancho.

**Botones**

- Principal: fondo `--primary` (casi negro), texto blanco, esquinas de 6 px (`rounded-md`),
  14 px medium.
- Secundario: blanco con borde (`outline`). Terciario: sin fondo ni borde (`ghost`).
- Icono de 16 px a la izquierda del texto, separado 8 px. Siempre cursor de mano.
- Sobrios: nada de botones de colores, salvo el rojo para borrar.

**Etiquetas (`Badge`)**

- Píldora (`rounded-full`), 12 px medium, relleno 8 × 2 px.
- Estado = fondo light + texto dark: "Disponible" verde, "Apartado" naranja, "Vendido" rojo. Neutras: fondo `--muted`, texto gris.
- Puntos de estado sobre fotos pequeñas: sólo el tono base, sin texto.

**Campos (`Input`, `Select`)**

- 36 px de alto, borde `--border`, esquinas de 6 px, fondo transparente, 14 px (16 px en
  celular para que el teléfono no haga zoom). Placeholder en gris.
- Etiqueta arriba en 14 px medium; nota de ayuda debajo en 12 px gris.

**Producto (como se ve en la caja)**

- Foto cuadrada con esquinas muy redondeadas (`rounded-3xl`), recortada (`object-cover`),
  fondo `--muted` si no hay foto (icono de paquete gris al centro).
- Nombre en 14 px semibold, máximo 2 renglones con "…". Precio en negrita debajo.
- Con promoción: precio rebajado en verde oscuro, el normal tachado en gris y una etiqueta
  "Promo" verde (fondo light, texto dark).

**Estados vacíos**

- Círculo `--muted` con un icono gris de 32 px al centro y una frase corta gris debajo.

**Avisos (toasts)**

- Esquina superior derecha, apilados; tarjeta con fondo light y texto dark del color: verde (hecho), rojo
  (error), amarillo (revisa algo), azul (información). Icono del mismo color del texto.

**Movimiento**

- Librería `motion`. Animaciones discretas: aparecer subiendo un poco (fade + 8 px), barras que
  crecen, una píldora que se desliza entre pestañas. Nada que rebote ni distraiga.

**Iconos**: Lucide, de línea, 16 px en botones y 20 px en títulos de tarjeta, color del texto.

---

## 4. Qué existe hoy (versión 1)

Un **panel interno** (sólo personal de la tienda, con sesión), en `app/(admin)/admin/dashboard/`:

- **Inicio**: ventas del día, gráfica de 30 días, pendientes, más vendidos, actividad reciente.
- **Proveedores**: corte mensual, existencias, promociones, historial de movimientos, PDFs.
- **Inventario**: productos y servicios, fotos, código de barras con etiqueta.
- **Clientes**: saldo a favor, apartados, abonos, estado de cuenta.
- **Caja registradora** (punto de venta), **Historial de ventas**, **Corte de caja**, tickets
  impresos de 58 mm.
- **Pedidos de servicio** con anticipos.

La landing de la versión 2 es la **primera cara pública** del proyecto.

---

## 5. Versión 2: landing de vitrina

### Objetivo

Que alguien de San Quintín (o que va de paso por la Transpeninsular) encuentre la tienda,
vea qué hay y vaya o escriba. **No hay carrito, ni pago, ni cuentas de cliente.**

### Secciones sugeridas

1. **Portada**: logo, frase corta de qué es la tienda, botón "Cómo llegar" y "Escríbenos".
2. **Productos destacados**: rejilla con foto, nombre y precio (datos reales, ver sección 6).
   Tarjetas al estilo del panel: foto cuadrada redondeada, nombre en dos líneas como máximo,
   precio en negrita.
3. **Servicios**: copias, actas, mantenimiento e instalación de software. Explicar que los
   de pedido se dejan y se recogen.
4. **Aparta con abonos**: cómo funciona en 3 pasos (eliges, apartas con un abono, terminas
   de pagar y te lo llevas).
5. **Marcas en la tienda**: logos de los proveedores.
6. **Visítanos**: dirección, mapa, horario, teléfono, correo, redes (@cuatastienda) y WhatsApp.

### Debe verse bien en celular primero

La mayoría de los visitantes llegarán desde el teléfono. En el panel ya seguimos estas reglas
y conviene repetirlas:

- Botones a todo lo ancho en celular; dos botones cortos pueden ir en el mismo renglón.
- Las tarjetas destacadas en celular van en un **carrusel de una fila** que se desliza de lado
  (se asoma la siguiente), no apiladas.
- Nada debe provocar desplazamiento horizontal de la página.

---

## 6. Datos que la landing puede usar

Hay un endpoint **público** (no pide sesión) con el catálogo disponible:

```
GET /api/products
```

Regresa sólo lo que está a la venta (sin retirados ni agotados), con estos campos:

```json
[
  {
    "id": 19,
    "title": "Ratón Logitech Usado",
    "price": "50",
    "picture": "https://res.cloudinary.com/.../products/CT-PAV6ANCG/picture.jpg",
    "type": "PRODUCT"
  },
  {
    "id": 21,
    "title": "Office 360 Professional Plus",
    "price": "400",
    "picture": "https://res.cloudinary.com/.../picture.jpg",
    "type": "SERVICE"
  }
]
```

| Campo | Notas |
|---|---|
| `id` | número |
| `title` | nombre; puede ser largo, conviene cortarlo a 2 líneas |
| `price` | **texto**, no número (`"50"`, `"28.5"`); hay que convertirlo y mostrarlo como `$50.00` |
| `picture` | URL de Cloudinary, o `null` si no tiene foto (usar un ícono de paquete de respaldo) |
| `type` | `"PRODUCT"` o `"SERVICE"` |

Limitaciones actuales que el diseño debe tomar en cuenta (o pedir para la v2):

- **No hay categorías** ni descripciones de producto.
- **No se expone el proveedor** en el catálogo público, ni las existencias.
- **No viene la promoción vigente** en el público (en la caja sí se ve el precio rebajado).
- Las fotos son de formatos variados (jpg, webp); se ven mejor recortadas en cuadrado.

---

## 7. Stack técnico (por si la landing vive en este mismo proyecto)

- Next.js 16 (App Router), React 19, TypeScript.
- Tailwind CSS v4 **sin archivo de configuración**: los colores son variables CSS en
  `app/globals.css` (`--my-blue`, `--my-blue-light`, `--my-blue-dark`, …), usadas como
  `bg-my-green-light text-my-green-dark`.
- Componentes shadcn/ui (estilo new-york, tono stone), iconos Lucide, animaciones con `motion`.
- Imágenes en Cloudinary (`res.cloudinary.com` ya está permitido en `next/image`).
- Repositorio: `tessarivas/CuatasTienda` en GitHub.

---

## 8. Preguntas abiertas para la v2

- ¿Se muestran **todos** los productos o sólo una selección destacada?
- ¿Se muestran precios en la vitrina? (El endpoint ya los trae.)
- Textos de presentación de cada proveedor.
- ¿Fotos de la tienda por dentro y por fuera para la portada?
- ¿Dominio propio para la página?
