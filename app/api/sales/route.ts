import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";
import { Prisma, PaymentMethod } from "@/generated/prisma/client";
import {
  requireUser,
  isUnsyncedUserError,
  unsyncedUserResponse,
} from "@/lib/auth/require-user";
import { nextFolio, isFolioCollision, FOLIO_RETRIES } from "@/lib/sales/folio";

const VALID_METHODS: ReadonlyArray<PaymentMethod> = [
  PaymentMethod.Efectivo,
  PaymentMethod.Tarjeta,
  PaymentMethod.Transferencia,
];

const MAX_MONEY = 100_000_000;

// Forma de una venta para la pantalla: la usan el Historial de Ventas (GET)
// y la respuesta al cobrar en caja (POST), para que el ticket (vista previa
// e impresión) se arme igual en los dos lugares.
const SALE_ROW_SELECT = {
  id: true,
  folio: true,
  date: true,
  total: true,
  discount: true,
  paymentMethod: true,
  receiptUrl: true,
  Client: { select: { id: true, name: true } },
  User: { select: { name: true } },
  SaleItem: {
    select: {
      id: true,
      quantity: true,
      finalPrice: true,
      discount: true,
      Product: {
        select: {
          id: true,
          title: true,
          type: true,
          Supplier: { select: { businessName: true } },
        },
      },
    },
  },
} satisfies Prisma.SaleSelect;

type DiscountInput = { type: "percentage" | "fixed"; value: number };

function parseDiscount(raw: unknown): DiscountInput | null | "invalid" {
  if (raw === undefined || raw === null) return null;
  const d = raw as { type?: unknown; value?: unknown };
  if (
    (d.type !== "percentage" && d.type !== "fixed") ||
    typeof d.value !== "number" ||
    !Number.isFinite(d.value) ||
    d.value < 0 ||
    (d.type === "percentage" && d.value > 100) ||
    (d.type === "fixed" && d.value > MAX_MONEY)
  ) {
    return "invalid";
  }
  return { type: d.type, value: d.value };
}

// Monto en pesos de un descuento sobre `base`, redondeado a centavos y nunca
// mayor que la base.
function discountAmount(base: Prisma.Decimal, d: DiscountInput | null) {
  if (!d) return new Prisma.Decimal(0);
  const raw =
    d.type === "percentage"
      ? base.times(d.value).dividedBy(100)
      : new Prisma.Decimal(d.value);
  const rounded = raw.toDecimalPlaces(2);
  return rounded.greaterThan(base) ? base : rounded;
}

// GET /api/sales?from=<ISO>&to=<ISO>
// Ventas del rango [from, to), más recientes primero — caja y liquidaciones
// de apartados. Sólo lectura; para "Historial de Ventas".
//
// El rango lo manda el cliente (p. ej. "hoy" en su hora local): el servidor
// puede correr en UTC. Los filtros de método/origen/búsqueda se hacen en la
// pantalla sobre este periodo, porque las tarjetas de resumen se calculan
// con el periodo completo.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = new Date(searchParams.get("from") ?? "");
  const to = new Date(searchParams.get("to") ?? "");
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) {
    return NextResponse.json(
      { error: "Rango de fechas inválido" },
      { status: 400 }
    );
  }

  try {
    const sales = await prisma.sale.findMany({
      where: { date: { gte: from, lt: to } },
      orderBy: { date: "desc" },
      select: SALE_ROW_SELECT,
    });
    return NextResponse.json(sales);
  } catch (err) {
    console.error("GET ventas falló", err);
    return NextResponse.json(
      { error: "No se pudieron cargar las ventas" },
      { status: 500 }
    );
  }
}

// POST /api/sales
// Venta de caja. Payload:
//   { items: [{ productId, quantity, discount? }], totalDiscount?, paymentMethod }
// con discount = { type: "percentage" | "fixed", value }.
//
// Todo en una transacción:
//   1. Precios desde la BD (snapshot en SaleItem.finalPrice) — no se confía
//      en los precios que manda la pantalla.
//   2. Sólo productos "Disponible"; los físicos necesitan unidades libres
//      (quantity − apartados activos). Los servicios no llevan stock.
//   3. Descuento al total sólo si todos los productos son de un mismo
//      proveedor: la tienda no reparte descuentos entre proveedores, así que
//      con varios sólo se descuenta por producto.
//   4. Folio DDMMYY-NNN (lib/sales/folio.ts), descuento de stock y soldCount;
//      "Vendido" cuando un producto queda en 0.
// userId sale de la sesión, nunca del body.
export async function POST(req: Request) {
  const { user: sessionUser, response } = await requireUser();
  if (response) return response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const input = body as {
    items?: unknown;
    totalDiscount?: unknown;
    paymentMethod?: unknown;
  };

  if (!(VALID_METHODS as readonly unknown[]).includes(input.paymentMethod)) {
    return NextResponse.json(
      { error: "Método de pago inválido" },
      { status: 400 }
    );
  }
  const paymentMethod = input.paymentMethod as PaymentMethod;

  if (!Array.isArray(input.items) || input.items.length === 0) {
    return NextResponse.json(
      { error: "La venta no tiene productos" },
      { status: 400 }
    );
  }

  // Una línea por producto: si la pantalla manda el mismo producto dos
  // veces, se rechaza en vez de adivinar cómo sumar sus descuentos.
  const lines: { productId: number; quantity: number; discount: DiscountInput | null }[] = [];
  for (const raw of input.items) {
    const it = raw as { productId?: unknown; quantity?: unknown; discount?: unknown };
    const productId = Number(it.productId);
    const quantity = Number(it.quantity);
    const discount = parseDiscount(it.discount);
    if (
      !Number.isInteger(productId) ||
      productId <= 0 ||
      !Number.isInteger(quantity) ||
      quantity <= 0 ||
      discount === "invalid"
    ) {
      return NextResponse.json(
        { error: "Producto inválido en la venta" },
        { status: 400 }
      );
    }
    if (lines.some((l) => l.productId === productId)) {
      return NextResponse.json(
        { error: "Producto repetido en la venta" },
        { status: 400 }
      );
    }
    lines.push({ productId, quantity, discount });
  }

  const totalDiscountInput = parseDiscount(input.totalDiscount);
  if (totalDiscountInput === "invalid") {
    return NextResponse.json({ error: "Descuento inválido" }, { status: 400 });
  }

  try {
    const run = () =>
      prisma.$transaction(async (tx) => {
        const products = await tx.product.findMany({
          where: { id: { in: lines.map((l) => l.productId) } },
          select: {
            id: true,
            title: true,
            price: true,
            status: true,
            type: true,
            quantity: true,
            supplierId: true,
          },
        });

        const computed = [];
        for (const line of lines) {
          const product = products.find((p) => p.id === line.productId);
          if (!product) {
            return { error: "Alguno de los productos no existe" as const, status: 404 };
          }
          if (product.status !== "Disponible") {
            return {
              error: `"${product.title}" ya no está disponible` as const,
              status: 409,
            };
          }
          if (product.type !== "SERVICE") {
            const reserved = await tx.layawayItem.count({
              where: {
                productId: product.id,
                status: "Activo",
                Layaway: { status: "Activo" },
              },
            });
            const available = (product.quantity ?? 0) - reserved;
            if (line.quantity > available) {
              return {
                error: `Sólo quedan ${Math.max(0, available)} unidades libres de "${product.title}"` as const,
                status: 409,
              };
            }
          }
          const gross = product.price.times(line.quantity);
          const discount = discountAmount(gross, line.discount);
          computed.push({ line, product, gross, discount, net: gross.minus(discount) });
        }

        const supplierIds = new Set(computed.map((c) => c.product.supplierId));
        if (totalDiscountInput && supplierIds.size > 1) {
          return {
            error:
              "No se puede aplicar un descuento al total con productos de varios proveedores; sólo por producto." as const,
            status: 400,
          };
        }

        const net = computed.reduce(
          (acc, c) => acc.plus(c.net),
          new Prisma.Decimal(0)
        );
        const saleDiscount = discountAmount(net, totalDiscountInput);
        const total = net.minus(saleDiscount);

        const sale = await tx.sale.create({
          data: {
            folio: await nextFolio(tx),
            total,
            discount: saleDiscount,
            paymentMethod,
            userId: sessionUser.id,
            SaleItem: {
              create: computed.map((c) => ({
                productId: c.product.id,
                finalPrice: c.product.price,
                quantity: c.line.quantity,
                discount: c.discount,
              })),
            },
          },
          select: SALE_ROW_SELECT,
        });

        for (const c of computed) {
          if (c.product.type === "SERVICE") {
            await tx.product.update({
              where: { id: c.product.id },
              data: { soldCount: { increment: c.line.quantity } },
            });
            continue;
          }
          // Decremento condicionado: si otra venta se llevó las unidades
          // entre la lectura y aquí, no se cumple y la venta se deshace.
          const updated = await tx.product.updateMany({
            where: { id: c.product.id, quantity: { gte: c.line.quantity } },
            data: {
              quantity: { decrement: c.line.quantity },
              soldCount: { increment: c.line.quantity },
            },
          });
          if (updated.count === 0) {
            throw new StockRaceError(c.product.title);
          }
          await tx.product.updateMany({
            where: { id: c.product.id, quantity: 0 },
            data: { status: "Vendido" },
          });
        }

        return { error: null, sale };
      });

    let result: Awaited<ReturnType<typeof run>>;
    for (let attempt = 1; ; attempt++) {
      try {
        result = await run();
        break;
      } catch (err) {
        if (isFolioCollision(err) && attempt < FOLIO_RETRIES) continue;
        throw err;
      }
    }

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ sale: result.sale }, { status: 201 });
  } catch (err) {
    if (err instanceof StockRaceError) {
      return NextResponse.json(
        { error: `Ya no quedan suficientes unidades de "${err.productTitle}"` },
        { status: 409 }
      );
    }
    if (isUnsyncedUserError(err)) {
      return unsyncedUserResponse();
    }
    console.error("POST venta falló", err);
    return NextResponse.json(
      { error: "No se pudo registrar la venta" },
      { status: 500 }
    );
  }
}

// Lanzada dentro de la transacción para deshacerla completa (no sólo
// devolver un error) cuando el stock cambió a mitad de la venta.
class StockRaceError extends Error {
  constructor(public productTitle: string) {
    super(`Stock insuficiente: ${productTitle}`);
  }
}
