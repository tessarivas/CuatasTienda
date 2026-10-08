import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";
import type { PaymentMethod } from "@/generated/prisma/client";
import {
  requireUser,
  isUnsyncedUserError,
  unsyncedUserResponse,
} from "@/lib/auth/require-user";
import { isFolioCollision } from "@/lib/sales/folio";
import { nextServiceFolio, servicePrefixFor, SERVICE_FOLIO_RETRIES } from "@/lib/services/folio";
import {
  ORDER_SELECT,
  addOrderPayment,
  checkOrderProducts,
  isValidMethod,
  parseAmountCents,
  parseOrderBody,
} from "@/lib/services/orders";

// GET /api/service-orders
// Todos los pedidos de servicio, del más nuevo al más viejo. Los filtros
// (por entregar / entregados / cancelados, búsqueda) los hace la pantalla.
export async function GET() {
  try {
    const orders = await prisma.serviceOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      select: ORDER_SELECT,
    });
    return NextResponse.json(orders);
  } catch (err) {
    console.error("GET pedidos de servicio falló", err);
    return NextResponse.json(
      { error: "No se pudieron cargar los pedidos de servicio" },
      { status: 500 }
    );
  }
}

// POST /api/service-orders
// { supplierId, customerName, customerPhone?, items: [{ productId,
//   description, quantity, price }] }
// Registra un pedido "Por entregar". No mueve dinero: se cobra al entregarlo
// (POST /api/service-orders/[id]/deliver). El precio de cada servicio es el
// de este pedido (puede ser distinto al del catálogo). createdBy sale de la
// sesión, nunca del body.
export async function POST(req: Request) {
  const { user: sessionUser, response } = await requireUser();
  if (response) return response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const supplierId = Number((body as { supplierId?: unknown }).supplierId);
  if (!Number.isInteger(supplierId) || supplierId <= 0) {
    return NextResponse.json({ error: "Elige el proveedor" }, { status: 400 });
  }
  const parsed = parseOrderBody(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  // Anticipo opcional al registrar (parcial o completo).
  const rawDeposit = (body as { deposit?: { amount?: unknown; method?: unknown } | null }).deposit;
  let deposit: { amountCents: number; method: PaymentMethod } | null = null;
  if (rawDeposit) {
    const amountCents = parseAmountCents(rawDeposit.amount);
    if (amountCents === null) {
      return NextResponse.json({ error: "Revisa el monto del anticipo" }, { status: 400 });
    }
    if (!isValidMethod(rawDeposit.method)) {
      return NextResponse.json({ error: "Elige cómo pagó el anticipo" }, { status: 400 });
    }
    deposit = { amountCents, method: rawDeposit.method };
  }
  const totalCents = parsed.items.reduce(
    (sum, i) => sum + Math.round(Number(i.price) * 100) * i.quantity,
    0
  );
  if (deposit && deposit.amountCents > totalCents) {
    return NextResponse.json(
      { error: "El anticipo no puede ser mayor al total del pedido" },
      { status: 400 }
    );
  }

  const run = () =>
    prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.findUnique({
        where: { id: supplierId },
        select: { servicePrefix: true, businessName: true, name: true },
      });
      if (!supplier) return { error: "Proveedor no encontrado" as const, status: 404 };

      const productError = await checkOrderProducts(tx, supplierId, parsed.items);
      if (productError) return { error: productError, status: 400 };

      const folio = await nextServiceFolio(tx, servicePrefixFor(supplier));
      const created = await tx.serviceOrder.create({
        data: {
          folio,
          supplierId,
          ...parsed.customer,
          createdBy: sessionUser.id,
          ServiceOrderItem: { create: parsed.items },
        },
        select: { id: true },
      });
      if (deposit) {
        await addOrderPayment(tx, {
          orderId: created.id,
          amountCents: deposit.amountCents,
          method: deposit.method,
          userId: sessionUser.id,
        });
      }
      const order = await tx.serviceOrder.findUnique({ where: { id: created.id }, select: ORDER_SELECT });
      return { error: null, order };
    });

  try {
    let result: Awaited<ReturnType<typeof run>>;
    for (let attempt = 1; ; attempt++) {
      try {
        result = await run();
        break;
      } catch (err) {
        if (isFolioCollision(err) && attempt < SERVICE_FOLIO_RETRIES) continue;
        throw err;
      }
    }
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result.order, { status: 201 });
  } catch (err) {
    if (isUnsyncedUserError(err)) return unsyncedUserResponse();
    console.error("POST pedido de servicio falló", err);
    return NextResponse.json(
      { error: "No se pudo guardar el pedido" },
      { status: 500 }
    );
  }
}
