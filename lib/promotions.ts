// Promociones por proveedor (#34): reglas compartidas por la caja (pantalla)
// y POST /api/sales, para que el descuento que se ve sea el que se cobra.
//
// Decidido con la tienda:
// - Porcentaje o cantidad fija; la cantidad fija es POR PIEZA.
// - Un descuento manual en caja REEMPLAZA a la promoción (uno por renglón).
// - No aplica a apartados ni a pedidos de servicio.
// - Puede ser de todos los productos del proveedor o sólo de algunos.
// - Un producto no puede estar en dos promociones a la vez (las fechas de
//   promociones que lo incluyen no se enciman). Un proveedor sí puede tener
//   varias a la vez con productos distintos.
// - Sólo productos de un proveedor por promoción.

export type PromotionType = "Porcentaje" | "CantidadFija";

export type ActivePromotion = {
  id: number;
  supplierId: number;
  name: string | null;
  type: PromotionType;
  value: number;
  startsOn: string; // YYYY-MM-DD
  endsOn: string; // YYYY-MM-DD
  // true = todos los productos del proveedor; si no, sólo productIds.
  allProducts: boolean;
  productIds: number[];
};

// ¿Esta promoción aplica a ese producto?
export const promoAppliesTo = (
  promo: Pick<ActivePromotion, "supplierId" | "allProducts" | "productIds">,
  product: { id: number; supplierId: number | null }
) =>
  promo.supplierId === product.supplierId &&
  (promo.allProducts || promo.productIds.includes(product.id));

// Descuento en pesos para UNA pieza de precio `price`, redondeado a
// centavos y nunca mayor que el precio.
export function promoUnitDiscount(price: number, promo: Pick<ActivePromotion, "type" | "value">): number {
  const priceCents = Math.round(price * 100);
  const cents =
    promo.type === "Porcentaje"
      ? Math.round((priceCents * promo.value) / 100)
      : Math.round(promo.value * 100);
  return Math.min(cents, priceCents) / 100;
}

// "20% menos" / "$10.00 menos por pieza", para etiquetas y la página del
// proveedor.
export function promoLabel(promo: Pick<ActivePromotion, "type" | "value">): string {
  return promo.type === "Porcentaje"
    ? `${Number(promo.value)}% menos`
    : `$${Number(promo.value).toFixed(2)} menos por pieza`;
}

// Fecha "YYYY-MM-DD" ↔ valor de una columna @db.Date (medianoche UTC).
export const toDbDate = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`);
export const fromDbDate = (d: Date | string) => new Date(d).toISOString().slice(0, 10);

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const isYmd = (value: unknown): value is string =>
  typeof value === "string" && DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(value));
