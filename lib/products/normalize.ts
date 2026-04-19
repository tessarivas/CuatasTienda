import type { Product, ProductStatus } from "@/lib/data";

// Shape returned by Prisma routes: numeric ids, Decimal-as-string price,
// nullable picture / quantity / code, DB column name `picture`. `reservedCount`
// viene del conteo de LayawayItem activos; opcional para backward-compat.
export type ApiProduct = {
  id: number;
  title: string;
  price: string | number;
  status: string;
  picture: string | null;
  quantity: number | null;
  code: string | null;
  supplierId: number | null;
  reservedCount?: number;
};

// The rest of the app uses the legacy mock shape (`photoUrl`, `barcode`,
// string ids, numeric price). One helper adapts at every API boundary so
// components don't have to know the DB column names.
export function normalizeProduct(p: ApiProduct): Product {
  return {
    id: String(p.id),
    supplierId: p.supplierId !== null ? String(p.supplierId) : "",
    title: p.title,
    price: Number(p.price),
    quantity: p.quantity ?? 0,
    status: p.status as ProductStatus,
    photoUrl: p.picture ?? "",
    barcode: p.code ?? undefined,
    reservedCount: p.reservedCount ?? 0,
  };
}

export function normalizeProducts(list: ApiProduct[]): Product[] {
  return list.map(normalizeProduct);
}
