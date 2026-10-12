// Textos y precios de la página pública. Están aquí (y no en la base) porque
// son de vitrina: los personalizados se cotizan por pedido y no son productos
// del inventario.

export type BrandColor = "red" | "yellow" | "blue";

// Cinta que corre debajo de la portada. Los puntitos alternan amarillo,
// azul y rojo según la posición (ver marquee.tsx), no según el texto.
export const MARQUEE = [
  "CURP",
  "NSS",
  "Copias a color",
  "Playeras personalizadas",
  "Tazas y termos",
  "Marcas locales",
  "Apartados con abonos",
];

export const MARQUEE_COLORS: BrandColor[] = ["yellow", "blue", "red"];

export type PriceItem = { name: string; price: number; from?: boolean };

// Personalizados: un flyer y su lista de precios por categoría.
export const CATEGORIES: {
  title: string;
  color: BrandColor;
  image: string;
  alt: string;
  items: PriceItem[];
}[] = [
  {
    title: "Bebidas",
    color: "red",
    image: "/landing/flyer-bebidas.webp",
    alt: "Termo jarra, botella deportiva y termo skinny personalizados",
    items: [
      { name: "Taza Blanca", price: 90 },
      { name: "Taza Mágica", price: 120 },
      { name: "Termos de Acero", price: 220, from: true },
      { name: "Termos de Aluminio", price: 180, from: true },
      { name: "Tequileros", price: 60 },
      { name: "Mason Jar", price: 150 },
    ],
  },
  {
    title: "Prendas de ropa",
    color: "yellow",
    image: "/landing/flyer-ropa.webp",
    alt: "Camisetas y sudaderas personalizadas para todas las edades",
    items: [
      { name: "Camiseta Manga Corta", price: 180, from: true },
      { name: "Camiseta Manga Larga", price: 200, from: true },
      { name: "Sudadera Gorro y Bolsa", price: 380, from: true },
      { name: "Suéter", price: 320, from: true },
      { name: "Suéter de Zíper", price: 420, from: true },
    ],
  },
  {
    title: "Regalos",
    color: "blue",
    image: "/landing/flyer-regalos.webp",
    alt: "Rompecabezas de corazón, botella de aluminio y gorra personalizados",
    items: [
      { name: "Rompecabezas", price: 120 },
      { name: "Llaveros", price: 60 },
      { name: "Tote Bag", price: 80 },
      { name: "Porta Retratos", price: 120 },
    ],
  },
];

export const ORDER_STEPS: { text: string; color: BrandColor }[] = [
  { text: "Mándanos tu diseño o tu idea.", color: "yellow" },
  { text: "Dejas un anticipo y lo hacemos.", color: "blue" },
  { text: "Te avisamos y pagas el resto al recoger.", color: "red" },
];

// Documentos que se imprimen al momento.
export const DOCUMENTS: { title: string; time: string; format: string; image: string }[] = [
  {
    title: "Acta de nacimiento",
    time: "Impresa al momento (15 min. aprox.)",
    format: "Impresa en Opalina",
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
    time: "Impresa al momento (15 min. aprox.)",
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

export const PRICE_TEXT: Record<BrandColor, string> = {
  red: "text-my-red",
  yellow: "text-my-yellow-dark",
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
