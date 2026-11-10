// Textos, precios e imágenes de la página pública. Están aquí (y no en la
// base) porque son de vitrina: los personalizados se cotizan por pedido y no
// son productos del inventario.
//
// Temporada actual: Navidad. Lo que es sólo de temporada (portada, cinta,
// fechas límite, pie) está en SEASON: al terminar, se cambian esos textos y
// las imágenes, y el resto de la página no se toca.

export type BrandColor = "red" | "yellow" | "blue";

export const SEASON = {
  hero: {
    title: ["Regalos", "con tu diseño,", "hechos aquí."],
    // Lo de `strong` va en negritas dentro del párrafo.
    intro: {
      before:
        "Personalizamos sudaderas, tazas, termos y más para tus intercambios, posadas y regalos de Navidad. ",
      strong: "Pide antes del 14 de diciembre",
      after: " y lo tienes listo para el 23. ¿Vienes por tus documentos? También te los imprimimos al momento.",
    },
    background: "/landing/xmas-hero-bg.webp",
    image: "/landing/xmas-hero.webp",
    imageAlt: "Sudadera roja con gorro de Santa y taza con chocolate, con el texto Tu diseño aquí",
    imageSize: { width: 578, height: 764 },
  },
  // Debajo de los pasos de "¿Cómo pedir?".
  orderNote: { before: "Para Navidad, pide antes del ", strong: "14 de diciembre" },
  // Recuadro rojo de "Entre más pides, menos pagas".
  deadlines: {
    title: "Fechas límite para Navidad",
    lines: [
      "Pedidos de 24 piezas o más: a más tardar el 7 de diciembre.",
      "Resto de los pedidos: a más tardar el 14 de diciembre.",
    ],
  },
  footerCta: "Cotiza tu regalo",
};

// Cinta que corre debajo de la portada. Los puntitos alternan amarillo,
// azul y rojo según la posición (ver marquee.tsx), no según el texto.
export const MARQUEE = [
  "Pide antes del 14 de diciembre",
  "Actas, CURP y NSS al momento",
  "Marcas locales",
  "Regalos con su nombre",
  "Regalos para intercambio",
  "Tazas navideñas",
  "Sudaderas en familia",
];

export const MARQUEE_COLORS: BrandColor[] = ["yellow", "blue", "red"];

// "Tú traes la idea": cinta de fotos de ejemplo que corre sola. Se muestran
// en este orden; los archivos son public/landing/ideas/NN.webp (copias
// comprimidas de public/christmas/Ideas-Carousel).
export const IDEAS: { image: string; alt: string }[] = [
  ["01", "Sudaderas de reno para pareja"],
  ["02", "Sudadera roja Familia Hernández, Feliz Navidad"],
  ["03", "Playeras de reno en familia, con el nombre de cada quien"],
  ["04", "Tazas navideñas para regalar, con foto"],
  ["05", "Tazas por docena con la inicial y el nombre de cada invitado"],
  ["06", "Rompecabezas con la foto de tu mascota"],
  ["07", "Playera del burrito sabanero"],
  ["08", "Taza con nombre y paisaje nevado"],
  ["09", "Playeras de Navidad en familia 2026"],
  ["10", "Sudadera de reno con Feliz Navidad"],
  ["11", "Playeras navideñas en familia"],
  ["12", "Gorros de Santa con nombre"],
  ["13", "Vasos Merry Christmas con nombre"],
  ["14", "Esferas navideñas con nombre"],
  ["15", "Pañalero Mi primera Navidad"],
  ["16", "Tazas con inicial, Navidad en familia"],
].map(([n, alt]) => ({ image: `/landing/ideas/${n}.webp`, alt }));

// "Entre más pides, menos pagas": una pestaña por producto. Lo que todavía
// no está (null o lista vacía) sale como bloque gris en la página.
export type PriceTier = { label: string; price: number; perUnit: boolean; best?: boolean };
export type GarmentColor = { name: string; hex: string };
export type PricedProduct = {
  key: string;
  label: string;
  // Fotos (la primera es la grande al abrir; todas salen como miniaturas);
  // null = espacio gris.
  images: (string | null)[];
  offers: string[];
  // Una fila por rango de tallas; `sizes` sale junto a la etiqueta.
  colors: { label: string; sizes?: string; swatches: GarmentColor[] }[];
  tiers: PriceTier[];
  note: string | null;
};

const C = {
  negro: { name: "Negro", hex: "#111111" },
  grisOxford: { name: "Gris oxford", hex: "#7a7a7a" },
  grisClaro: { name: "Gris claro", hex: "#d6d4d2" },
  blanco: { name: "Blanco", hex: "#ffffff" },
  verde: { name: "Verde bosque", hex: "#1f4a2c" },
  marino: { name: "Azul marino", hex: "#0c1a6b" },
  rey: { name: "Azul rey", hex: "#2f7cf6" },
  vino: { name: "Vino", hex: "#6b1410" },
  rojo: { name: "Rojo", hex: "#dc3a1c" },
  arena: { name: "Arena", hex: "#f3ead6" },
};

// Colores de las playeras (catálogo Gildan de la tienda). Los tonos son
// aproximados: sirven para darse una idea, el nombre es lo que cuenta.
const P = {
  blanco: { name: "Blanco", hex: "#ffffff" },
  negro: { name: "Negro", hex: "#141414" },
  marino: { name: "Marino", hex: "#1c2541" },
  grisJaspe: { name: "Gris jaspe", hex: "#c5c5c7" },
  grisJaspeOscuro: { name: "Gris jaspe oscuro", hex: "#45484c" },
  carbon: { name: "Carbón", hex: "#5a5c60" },
  royal: { name: "Royal", hex: "#2756b0" },
  turquesa: { name: "Turquesa", hex: "#1c8fd1" },
  azulClaro: { name: "Azul claro", hex: "#a9c8ea" },
  jade: { name: "Jade", hex: "#14a19a" },
  rosaPalo: { name: "Rosa palo", hex: "#f6c4d4" },
  heliconia: { name: "Heliconia", hex: "#e0287b" },
  coral: { name: "Coral", hex: "#f26b5e" },
  rojoCereza: { name: "Rojo cereza", hex: "#c3141f" },
  rojo: { name: "Rojo", hex: "#d21f2b" },
  marron: { name: "Marrón", hex: "#6e1d2a" },
  chocolate: { name: "Chocolate", hex: "#4b3022" },
  arena: { name: "Arena", hex: "#e9ddc3" },
  morado: { name: "Morado", hex: "#5a2d8f" },
  naranja: { name: "Naranja", hex: "#f36a21" },
  oro: { name: "Oro", hex: "#fbae2c" },
  amarillo: { name: "Amarillo brillante", hex: "#f6d21f" },
  lima: { name: "Lima", hex: "#8fc841" },
  verdePasto: { name: "Verde pasto", hex: "#139a5d" },
  verdeMilitar: { name: "Verde militar", hex: "#5d6a44" },
  verdeBosque: { name: "Verde bosque", hex: "#1f4a2c" },
};

// Fotos de public/landing/ideas por número; las que faltan salen en gris.
const photos = (...ids: string[]) =>
  [0, 1, 2].map((i) => (ids[i] ? `/landing/ideas/${ids[i]}.webp` : null));

// Las 3 fotos propias de un producto: public/landing/products/{nombre}-0N.webp
// (copias comprimidas de public/christmas/products).
const productPhotos = (name: string) => [1, 2, 3].map((n) => `/landing/products/${name}-0${n}.webp`);

// Pestaña sin datos todavía (sólo fotos, si las hay).
const pending = (key: string, label: string, images = photos()): PricedProduct => ({
  key,
  label,
  images,
  offers: [],
  colors: [],
  tiers: [],
  note: null,
});

export const PRICED_PRODUCTS: PricedProduct[] = [
  {
    ...pending("manga-corta", "Camisetas Manga Corta", photos("03", "09", "07")),
    offers: [
      "Playera de cuello redondo, 100% algodón",
      "Te mostramos cómo queda antes de imprimir",
      "Tallas desde 2T de bebé hasta 2XL de adulto",
    ],
    // Misma escala que las sudaderas: -$5, -$15 y -$20 por pieza.
    tiers: [
      { label: "1 pieza", price: 180, perUnit: false },
      { label: "2 piezas", price: 175, perUnit: true },
      { label: "12 o más", price: 165, perUnit: true },
      { label: "24 o más", price: 160, perUnit: true, best: true },
    ],
    note: "El precio incluye un diseño al frente o atrás. Diseños combinados o en varias partes de la camiseta tienen costo extra.",
    colors: [
      {
        label: "Bebé",
        sizes: "2T a 5T",
        swatches: [P.blanco, P.marino, P.negro, P.grisJaspe, P.royal, P.rosaPalo, P.rojoCereza, P.azulClaro],
      },
      {
        label: "Juvenil",
        sizes: "XS (2-4) a XL (18-20)",
        swatches: [
          P.blanco, P.arena, P.grisJaspe, P.marino, P.rojoCereza, P.marron, P.azulClaro, P.royal, P.turquesa,
          P.negro, P.heliconia, P.naranja, P.lima, P.rosaPalo, P.morado, P.oro, P.amarillo, P.chocolate,
        ],
      },
      {
        label: "Adulto",
        sizes: "S a 2XL",
        swatches: [
          P.marino, P.negro, P.blanco, P.chocolate, P.arena, P.morado, P.heliconia, P.coral, P.rojoCereza,
          P.rosaPalo, P.royal, P.turquesa, P.jade, P.azulClaro, P.marron, P.verdeMilitar, P.carbon, P.grisJaspe,
          P.grisJaspeOscuro, P.verdePasto, P.lima, P.amarillo, P.naranja, P.oro,
        ],
      },
    ],
  },
  {
    ...pending("manga-larga", "Camisetas Manga Larga", productPhotos("manga-larga")),
    offers: [
      "Dos opciones: clásica 100% algodón, o suave 90% algodón y 10% poliéster",
      "Te mostramos cómo queda antes de imprimir",
      "Tallas de adulto, de S a 2XL",
    ],
    // Misma escala que las sudaderas: -$5, -$15 y -$20 por pieza.
    tiers: [
      { label: "1 pieza", price: 200, perUnit: false },
      { label: "2 piezas", price: 195, perUnit: true },
      { label: "12 o más", price: 185, perUnit: true },
      { label: "24 o más", price: 180, perUnit: true, best: true },
    ],
    note: "El precio incluye un diseño al frente o atrás. Diseños combinados o en varias partes de la camiseta tienen costo extra.",
    colors: [
      {
        label: "Clásica",
        sizes: "100% algodón, S a 2XL",
        swatches: [P.blanco, P.negro, P.grisJaspe, P.rojoCereza, P.oro, P.marino, P.royal],
      },
      {
        label: "Suave",
        sizes: "90% algodón, S a 2XL",
        swatches: [P.grisJaspe, P.verdeMilitar, P.rojoCereza, P.carbon],
      },
    ],
  },
  {
    key: "sudaderas",
    label: "Sudaderas",
    images: productPhotos("sudadera"),
    offers: [
      "Sudadera Gildan Heavy Cotton, 50% algodón y 50% poliéster",
      "Te mostramos cómo queda antes de imprimir",
      "Tallas desde 6 años hasta 2XL de adulto",
    ],
    colors: [
      {
        label: "Juveniles",
        swatches: [C.negro, C.grisClaro, C.blanco, C.verde, C.marino, C.rey, C.vino, C.rojo],
      },
      {
        label: "Adulto",
        swatches: [C.negro, C.grisOxford, C.grisClaro, C.blanco, C.verde, C.marino, C.rey, C.vino, C.rojo, C.arena],
      },
    ],
    tiers: [
      { label: "1 pieza", price: 380, perUnit: false },
      { label: "2 piezas", price: 375, perUnit: true },
      { label: "12 o más", price: 365, perUnit: true },
      { label: "24 o más", price: 360, perUnit: true, best: true },
    ],
    note: "El precio incluye un diseño al frente o atrás. Diseños combinados o en varias partes de la sudadera tienen costo extra.",
  },
  {
    ...pending("sueteres", "Suéteres", productPhotos("sueter")),
    offers: [
      "Sudadera de cuello redondo, 50% algodón y 50% poliéster",
      "Te mostramos cómo queda antes de imprimir",
      "Tallas desde 6/8 juvenil hasta 2XL de adulto",
    ],
    // Misma escala que las sudaderas: -$5, -$15 y -$20 por pieza.
    tiers: [
      { label: "1 pieza", price: 340, perUnit: false },
      { label: "2 piezas", price: 335, perUnit: true },
      { label: "12 o más", price: 325, perUnit: true },
      { label: "24 o más", price: 320, perUnit: true, best: true },
    ],
    note: "El precio incluye un diseño al frente o atrás. Diseños combinados o en varias partes del suéter tienen costo extra.",
    // Marrón, Arena, Rosa palo y Azul claro son de importación (catálogo
    // aparte); van junto con los demás de su talla.
    colors: [
      {
        label: "Juvenil",
        sizes: "6/8 a 18/20",
        swatches: [P.negro, P.blanco, P.marino, P.grisJaspe, P.verdeBosque, P.rojo, P.royal, P.marron],
      },
      {
        label: "Adulto",
        sizes: "S a 2XL",
        swatches: [
          P.negro, P.blanco, P.marino, P.rojo, P.royal, P.grisJaspe, P.grisJaspeOscuro, P.verdeBosque, P.morado,
          P.marron, P.arena, P.rosaPalo, P.azulClaro,
        ],
      },
    ],
  },
  {
    ...pending("tazas", "Tazas", photos("04", "05", "16")),
    offers: [
      "Taza de 11 oz: de cerámica blanca, o mágica negra mate",
      "Te mostramos cómo queda antes de imprimir",
      "En la mágica tu diseño aparece al servir algo caliente",
    ],
    // Misma escala que las sudaderas: -$5, -$15 y -$20 por pieza.
    tiers: [
      { label: "1 pieza", price: 90, perUnit: false },
      { label: "2 piezas", price: 85, perUnit: true },
      { label: "12 o más", price: 75, perUnit: true },
      { label: "24 o más", price: 70, perUnit: true, best: true },
    ],
    colors: [
      {
        label: "Taza",
        sizes: "11 oz",
        swatches: [
          { name: "Cerámica blanca", hex: "#ffffff" },
          { name: "Mágica negra mate", hex: "#1f1f1f" },
        ],
      },
    ],
  },
  pending("termos", "Termos"),
  pending("botellas", "Botellas de agua"),
  pending("llaveros", "Llaveros"),
  pending("gorros", "Gorros", photos("12")),
];

export const DEFAULT_PRICED_PRODUCT = "sudaderas";

// "Así quedan nuestros pedidos": fotos de trabajos entregados y opiniones,
// en tres columnas (en ese orden de arriba abajo). image null = gris;
// opinión sin `quote` = tarjeta gris hasta tener el texto real del cliente.
export type GalleryItem =
  | { kind: "photo"; image: string | null; caption: string; tall?: boolean }
  | { kind: "quote"; quote: string | null; name: string | null; product: string | null; color: BrandColor };

export const GALLERY: GalleryItem[][] = [
  [
    { kind: "photo", image: null, caption: "Camiseta Personalizada", tall: true },
    { kind: "quote", quote: null, name: null, product: null, color: "yellow" },
  ],
  [
    { kind: "quote", quote: null, name: null, product: null, color: "red" },
    { kind: "photo", image: null, caption: "Sudadera para Regalar" },
    { kind: "photo", image: null, caption: "Relojes Personalizados" },
  ],
  [
    { kind: "photo", image: null, caption: "Camisetas de Cumpleaños" },
    { kind: "quote", quote: null, name: null, product: null, color: "blue" },
    { kind: "photo", image: null, caption: "Sudaderas en Familia" },
  ],
];

export const ORDER_STEPS: { text: string; color: BrandColor }[] = [
  { text: "Mándanos tu diseño o tu idea.", color: "yellow" },
  { text: "Pide con un anticipo y lo hacemos.", color: "blue" },
  { text: "Te avisamos y pagas el resto al recoger.", color: "red" },
];

// Documentos que se imprimen al momento.
export const DOCUMENTS: { title: string; time: string; format: string; image: string }[] = [
  {
    title: "Acta de nacimiento",
    time: "Impresa al momento (15 min. aprox.)",
    format: "Digital PDF e Impresa en Opalina",
    image: "/landing/doc-acta.webp",
  },
  {
    title: "CURP",
    time: "Impresa al momento (3 min. aprox.)",
    format: "Digital PDF e Impreso",
    image: "/landing/doc-curp.webp",
  },
  {
    title: "Número de Seguro Social",
    time: "Impreso al momento (15 min. aprox.)",
    format: "Digital PDF e Impreso",
    image: "/landing/doc-nss.webp",
  },
  {
    title: "Constancia de Situación Fiscal",
    time: "Impresa en un par de horas",
    format: "Digital PDF e Impresa en Opalina",
    image: "/landing/doc-constancia.webp",
  },
];

// Clases por color de marca (completas para que Tailwind las encuentre).
export const DOT: Record<string, string> = {
  red: "bg-my-red",
  yellow: "bg-my-yellow",
  blue: "bg-my-blue",
  green: "bg-my-green",
  orange: "bg-my-orange",
  pink: "bg-my-pink",
};

export const QUOTE_TEXT: Record<BrandColor, string> = {
  red: "text-my-red",
  yellow: "text-my-yellow",
  blue: "text-my-blue",
};

export const STEP_NUMBER: Record<BrandColor, string> = {
  red: "bg-my-red text-black",
  yellow: "bg-my-yellow text-black",
  blue: "bg-my-blue text-black",
};

// $90 si es entero; $28.50 si lleva centavos.
export const money = (n: number) =>
  `$${n.toLocaleString("es-MX", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;
