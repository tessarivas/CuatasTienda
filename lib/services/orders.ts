import { Prisma, PaymentMethod } from "@/generated/prisma/client";
import { nextFolio } from "@/lib/sales/folio";

// Lo que regresan las rutas de pedidos de servicio (/api/service-orders/*):
// el pedido con su proveedor, quién lo registró, sus servicios y, si ya se
// cobró, la venta que se generó.
export const ORDER_SELECT = {
  id: true,
  folio: true,
  customerName: true,
  customerPhone: true,
  status: true,
  createdAt: true,
  deliveredAt: true,
  cancelledAt: true,
  Supplier: { select: { id: true, name: true, businessName: true } },
  User: { select: { name: true } },
  Sale: { select: { id: true, folio: true, date: true, paymentMethod: true, total: true } },
  ServiceOrderItem: {
    orderBy: { id: "asc" },
    select: {
      id: true,
      productId: true,
      description: true,
      quantity: true,
      price: true,
      Product: { select: { title: true } },
    },
  },
  ServiceOrderPayment: {
    orderBy: { date: "asc" },
    select: {
      id: true,
      amount: true,
      method: true,
      kind: true,
      date: true,
      User: { select: { name: true } },
    },
  },
} satisfies Prisma.ServiceOrderSelect;

const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;
const MAX_ITEMS = 50;

export type OrderItemInput = {
  productId: number;
  description: string;
  quantity: number;
  price: string; // ya con .toFixed(2)
};

export type OrderCustomerInput = { customerName: string; customerPhone: string | null };

// Validación manual (como el resto de las rutas) de lo que manda el modal
// del pedido. Regresa los datos limpios o el mensaje de error en español.
export function parseOrderBody(body: unknown):
  | { error: string }
  | { customer: OrderCustomerInput; items: OrderItemInput[] } {
  const input = body as {
    customerName?: unknown;
    customerPhone?: unknown;
    items?: unknown;
  };

  const customerName = typeof input.customerName === "string" ? input.customerName.trim() : "";
  if (!customerName) return { error: "Escribe el nombre del cliente" };
  if (customerName.length > 120) return { error: "El nombre es demasiado largo" };

  let customerPhone: string | null = null;
  if (input.customerPhone !== undefined && input.customerPhone !== null) {
    if (typeof input.customerPhone !== "string") return { error: "Teléfono inválido" };
    customerPhone = input.customerPhone.trim() || null;
    if (customerPhone && customerPhone.length > 30) return { error: "El teléfono es demasiado largo" };
  }

  if (!Array.isArray(input.items) || input.items.length === 0) {
    return { error: "Agrega al menos un servicio" };
  }
  if (input.items.length > MAX_ITEMS) return { error: "Demasiados servicios en un pedido" };

  const items: OrderItemInput[] = [];
  for (const raw of input.items) {
    const item = raw as { productId?: unknown; description?: unknown; quantity?: unknown; price?: unknown };
    const productId = Number(item.productId);
    if (!Number.isInteger(productId) || productId <= 0) return { error: "Elige el servicio de cada renglón" };
    const description = typeof item.description === "string" ? item.description.trim() : "";
    if (!description) return { error: "Escribe qué se va a hacer en cada servicio" };
    if (description.length > 200) return { error: "La descripción de un servicio es demasiado larga" };
    const quantity = Number(item.quantity ?? 1);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
      return { error: "La cantidad debe ser un número entero de 1 en adelante" };
    }
    const priceStr =
      typeof item.price === "string" || typeof item.price === "number" ? String(item.price).trim() : "";
    if (!MONEY_PATTERN.test(priceStr) || Number(priceStr) >= 100_000_000) {
      return { error: "El precio debe tener hasta dos decimales" };
    }
    items.push({ productId, description, quantity, price: Number(priceStr).toFixed(2) });
  }

  return { customer: { customerName, customerPhone }, items };
}

// Revisa (dentro de la transacción) que todos los servicios existan, sean
// servicios, no estén retirados y sean del proveedor del pedido: el folio es
// del proveedor, así que un pedido no mezcla proveedores.
export async function checkOrderProducts(
  tx: Prisma.TransactionClient,
  supplierId: number,
  items: OrderItemInput[]
): Promise<string | null> {
  const ids = [...new Set(items.map((i) => i.productId))];
  const products = await tx.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, type: true, status: true, supplierId: true },
  });
  if (products.length !== ids.length) return "Uno de los servicios ya no existe";
  for (const p of products) {
    if (p.type !== "SERVICE") return "Sólo se pueden agregar servicios a un pedido";
    if (p.status === "Retirado") return "Uno de los servicios ya no está disponible";
    if (p.supplierId !== supplierId) return "Todos los servicios del pedido deben ser del mismo proveedor";
  }
  return null;
}

export const VALID_METHODS: ReadonlyArray<PaymentMethod> = [
  PaymentMethod.Efectivo,
  PaymentMethod.Tarjeta,
  PaymentMethod.Transferencia,
];

export const isValidMethod = (value: unknown): value is PaymentMethod =>
  (VALID_METHODS as readonly unknown[]).includes(value);

// "123.45" / 123.45 → centavos, o null si no es un monto válido (> 0).
export function parseAmountCents(value: unknown): number | null {
  const str = typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
  if (!MONEY_PATTERN.test(str)) return null;
  const cents = Math.round(Number(str) * 100);
  return cents > 0 && cents < 10_000_000_000 ? cents : null;
}

// Total del pedido, lo pagado (anticipos/pagos menos devoluciones) y lo que
// resta, en centavos, leído dentro de la transacción.
export async function orderMoney(tx: Prisma.TransactionClient, orderId: number) {
  const order = await tx.serviceOrder.findUnique({
    where: { id: orderId },
    select: {
      status: true,
      saleId: true,
      ServiceOrderItem: { select: { price: true, quantity: true } },
      ServiceOrderPayment: { select: { amount: true, kind: true } },
    },
  });
  if (!order) return null;
  const totalCents = order.ServiceOrderItem.reduce(
    (sum, i) => sum + Math.round(Number(i.price) * 100) * i.quantity,
    0
  );
  const paidCents = order.ServiceOrderPayment.reduce(
    (sum, p) => sum + (p.kind === "Devolucion" ? -1 : 1) * Math.round(Number(p.amount) * 100),
    0
  );
  return {
    status: order.status,
    saleId: order.saleId,
    totalCents,
    paidCents,
    restCents: Math.max(0, totalCents - paidCents),
  };
}

// Registra un anticipo o pago. Si con él el pedido queda pagado completo,
// se crea la venta en ese momento (decidido: el servicio cuenta para el
// corte del proveedor cuando se paga completo). La venta lleva el método de
// este último pago, pero NO se cuenta en el corte de caja: ese dinero ya
// entró con cada pago (ver collect() en api/cash-closing).
export async function addOrderPayment(
  tx: Prisma.TransactionClient,
  input: { orderId: number; amountCents: number; method: PaymentMethod; userId: string }
) {
  await tx.serviceOrderPayment.create({
    data: {
      orderId: input.orderId,
      amount: (input.amountCents / 100).toFixed(2),
      method: input.method,
      receivedBy: input.userId,
    },
  });
  await settleIfPaid(tx, input.orderId, input.userId);
}

// Si el pedido ya quedó pagado completo y todavía no tiene venta, la crea
// con el método del último pago. Se llama después de cada pago y al editar
// (si el total nuevo queda igual a lo ya pagado).
export async function settleIfPaid(tx: Prisma.TransactionClient, orderId: number, userId: string) {
  const money = await orderMoney(tx, orderId);
  if (!money || money.saleId !== null || money.paidCents <= 0 || money.restCents > 0) return;
  const last = await tx.serviceOrderPayment.findFirst({
    where: { orderId, kind: "Abono" },
    orderBy: { date: "desc" },
    select: { method: true },
  });
  await createOrderSale(tx, orderId, userId, last?.method ?? "Efectivo");
}

// Crea la venta del pedido (un SaleItem por servicio, con su descripción y
// precio) y la liga al pedido. Los servicios no llevan existencia.
async function createOrderSale(
  tx: Prisma.TransactionClient,
  orderId: number,
  userId: string,
  method: PaymentMethod
) {
  const items = await tx.serviceOrderItem.findMany({
    where: { orderId },
    select: { productId: true, description: true, quantity: true, price: true },
  });
  const totalCents = items.reduce((sum, i) => sum + Math.round(Number(i.price) * 100) * i.quantity, 0);
  const sale = await tx.sale.create({
    data: {
      folio: await nextFolio(tx),
      total: (totalCents / 100).toFixed(2),
      discount: 0,
      paymentMethod: method,
      userId,
      SaleItem: {
        create: items.map((i) => ({
          productId: i.productId,
          finalPrice: i.price,
          quantity: i.quantity,
          discount: 0,
          description: i.description,
        })),
      },
    },
    select: { id: true },
  });
  for (const i of items) {
    await tx.product.update({
      where: { id: i.productId },
      data: { soldCount: { increment: i.quantity } },
    });
  }
  await tx.serviceOrder.update({ where: { id: orderId }, data: { saleId: sale.id } });
}
