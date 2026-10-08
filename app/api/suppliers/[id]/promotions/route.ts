import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";
import { requireUser, isUnsyncedUserError, unsyncedUserResponse } from "@/lib/auth/require-user";
import { storeDateString } from "@/lib/store-time";
import { fromDbDate, isYmd, toDbDate } from "@/lib/promotions";

type Ctx = { params: Promise<{ id: string }> };

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;

const PROMO_SELECT = {
  id: true,
  name: true,
  type: true,
  value: true,
  startsOn: true,
  endsOn: true,
  cancelledAt: true,
  createdAt: true,
  User: { select: { name: true } },
  _count: { select: { SaleItem: true } },
  allProducts: true,
  Products: { select: { Product: { select: { id: true, title: true } } } },
} as const;

type PromoRow = {
  id: number;
  name: string | null;
  type: "Porcentaje" | "CantidadFija";
  value: { toString(): string };
  startsOn: Date;
  endsOn: Date;
  cancelledAt: Date | null;
  createdAt: Date;
  User: { name: string };
  _count: { SaleItem: number };
  allProducts: boolean;
  Products: { Product: { id: number; title: string } }[];
};

// Fechas como "YYYY-MM-DD" y _count aplanado (piezas/renglones vendidos con
// la promoción) para la pantalla.
const toJson = (p: PromoRow) => ({
  id: p.id,
  name: p.name,
  type: p.type,
  value: Number(p.value),
  startsOn: fromDbDate(p.startsOn),
  endsOn: fromDbDate(p.endsOn),
  cancelledAt: p.cancelledAt,
  createdAt: p.createdAt,
  createdBy: p.User.name,
  salesCount: p._count.SaleItem,
  allProducts: p.allProducts,
  products: p.Products.map((x) => x.Product),
});

// GET /api/suppliers/[id]/promotions
// Todas las promociones del proveedor (vigente, programadas, pasadas y
// canceladas), de la más nueva a la más vieja.
export async function GET(_req: Request, { params }: Ctx) {
  const { id: rawId } = await params;
  const supplierId = parseId(rawId);
  if (supplierId === null) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  try {
    const promotions = await prisma.supplierPromotion.findMany({
      where: { supplierId },
      orderBy: { startsOn: "desc" },
      select: PROMO_SELECT,
    });
    return NextResponse.json(promotions.map(toJson));
  } catch (err) {
    console.error("GET promociones de proveedor falló", err);
    return NextResponse.json({ error: "No se pudieron cargar las promociones" }, { status: 500 });
  }
}

// POST /api/suppliers/[id]/promotions
// { name?, type: "Porcentaje" | "CantidadFija", value, startsOn, endsOn,
//   allProducts?: boolean (true por defecto), productIds?: number[] }
// Fechas = días de la tienda, ambos inclusive. No se puede crear una que ya
// terminó. Regla "una a la vez" POR PRODUCTO: ningún producto puede quedar en
// dos promociones no canceladas con fechas encimadas (una de "todos los
// productos" choca con cualquier otra del proveedor en esas fechas). Los
// productos elegidos tienen que ser de este proveedor. createdBy sale de la
// sesión.
export async function POST(req: Request, { params }: Ctx) {
  const { id: rawId } = await params;
  const supplierId = parseId(rawId);
  if (supplierId === null) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  const { user: sessionUser, response } = await requireUser();
  if (response) return response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const input = body as {
    name?: unknown;
    type?: unknown;
    value?: unknown;
    startsOn?: unknown;
    endsOn?: unknown;
    allProducts?: unknown;
    productIds?: unknown;
  };

  const name = typeof input.name === "string" ? input.name.trim() || null : null;
  if (name && name.length > 60) {
    return NextResponse.json({ error: "El nombre es demasiado largo" }, { status: 400 });
  }
  if (input.type !== "Porcentaje" && input.type !== "CantidadFija") {
    return NextResponse.json({ error: "Elige si es porcentaje o pesos" }, { status: 400 });
  }
  const valueStr =
    typeof input.value === "string" || typeof input.value === "number" ? String(input.value).trim() : "";
  const value = Number(valueStr);
  if (!MONEY_PATTERN.test(valueStr) || value <= 0) {
    return NextResponse.json({ error: "Escribe cuánto se descuenta" }, { status: 400 });
  }
  if (input.type === "Porcentaje" && value >= 100) {
    return NextResponse.json({ error: "El porcentaje debe ser menor a 100" }, { status: 400 });
  }
  if (!isYmd(input.startsOn) || !isYmd(input.endsOn)) {
    return NextResponse.json({ error: "Elige las fechas de la promoción" }, { status: 400 });
  }
  const startsOn = input.startsOn;
  const endsOn = input.endsOn;
  if (endsOn < startsOn) {
    return NextResponse.json({ error: "La fecha final no puede ser antes de la inicial" }, { status: 400 });
  }
  if (endsOn < storeDateString()) {
    return NextResponse.json({ error: "Esas fechas ya pasaron" }, { status: 400 });
  }
  const allProducts = input.allProducts !== false;
  let productIds: number[] = [];
  if (!allProducts) {
    if (!Array.isArray(input.productIds) || input.productIds.length === 0) {
      return NextResponse.json({ error: "Elige al menos un producto" }, { status: 400 });
    }
    productIds = [...new Set(input.productIds.map(Number))];
    if (productIds.some((id) => !Number.isInteger(id) || id <= 0)) {
      return NextResponse.json({ error: "Productos inválidos" }, { status: 400 });
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.findUnique({ where: { id: supplierId }, select: { id: true } });
      if (!supplier) return { error: "Proveedor no encontrado" as const, status: 404 };

      if (!allProducts) {
        const owned = await tx.product.count({
          where: { id: { in: productIds }, supplierId, status: { not: "Retirado" } },
        });
        if (owned !== productIds.length) {
          return { error: "Sólo se pueden elegir productos de este proveedor" as const, status: 400 };
        }
      }

      // Una a la vez POR PRODUCTO. Choca con otra promoción del proveedor,
      // no cancelada y con fechas encimadas, si alguna de las dos es de
      // "todos los productos" o si comparten algún producto.
      const overlapping = await tx.supplierPromotion.findMany({
        where: {
          supplierId,
          cancelledAt: null,
          startsOn: { lte: toDbDate(endsOn) },
          endsOn: { gte: toDbDate(startsOn) },
        },
        select: {
          name: true,
          startsOn: true,
          endsOn: true,
          allProducts: true,
          Products: { select: { productId: true, Product: { select: { title: true } } } },
        },
      });
      for (const other of overlapping) {
        const shared = allProducts
          ? other.Products.map((x) => x.Product.title)
          : other.Products.filter((x) => productIds.includes(x.productId)).map((x) => x.Product.title);
        if (allProducts || other.allProducts || shared.length > 0) {
          const when = `del ${fromDbDate(other.startsOn)} al ${fromDbDate(other.endsOn)}`;
          const label = other.name ? `"${other.name}" ` : "";
          return {
            error:
              other.allProducts || allProducts
                ? `Se encima con la promoción ${label}${when}. Un producto no puede estar en dos promociones a la vez.`
                : `${shared.slice(0, 3).join(", ")} ya ${shared.length === 1 ? "está" : "están"} en la promoción ${label}${when}.`,
            status: 409,
          };
        }
      }

      const created = await tx.supplierPromotion.create({
        data: {
          supplierId,
          name,
          type: input.type as "Porcentaje" | "CantidadFija",
          value: value.toFixed(2),
          startsOn: toDbDate(startsOn),
          endsOn: toDbDate(endsOn),
          createdBy: sessionUser.id,
          allProducts,
          Products: allProducts ? undefined : { create: productIds.map((productId) => ({ productId })) },
        },
        select: PROMO_SELECT,
      });
      return { error: null, promotion: created };
    });

    if (result.error !== null || !result.promotion) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(toJson(result.promotion), { status: 201 });
  } catch (err) {
    if (isUnsyncedUserError(err)) return unsyncedUserResponse();
    console.error("POST promoción falló", err);
    return NextResponse.json({ error: "No se pudo guardar la promoción" }, { status: 500 });
  }
}
