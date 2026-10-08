// Forma de /api/service-orders (Decimal llega como string) y palabras de la
// tienda para los estados.

export type OrderStatus = "PorEntregar" | "Entregado" | "Cancelado";

export type ApiServiceOrder = {
  id: number;
  folio: string;
  customerName: string;
  customerPhone: string | null;
  status: OrderStatus;
  createdAt: string;
  deliveredAt: string | null;
  cancelledAt: string | null;
  Supplier: { id: number; name: string; businessName: string | null };
  User: { name: string };
  Sale: {
    id: number;
    folio: string | null;
    date: string;
    paymentMethod: "Efectivo" | "Tarjeta" | "Transferencia" | null;
    total: string;
  } | null;
  ServiceOrderItem: {
    id: number;
    productId: number;
    description: string;
    quantity: number;
    price: string;
    Product: { title: string };
  }[];
  // Anticipos/pagos (Abono) y devoluciones del pedido.
  ServiceOrderPayment: {
    id: number;
    amount: string;
    method: "Efectivo" | "Tarjeta" | "Transferencia";
    kind: "Abono" | "Devolucion";
    date: string;
    User: { name: string };
  }[];
};

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PorEntregar: "Por entregar",
  Entregado: "Entregado",
  Cancelado: "Cancelado",
};

// Etiqueta = fondo -light + texto -dark. "Por entregar" en naranja, como
// "Apartado" (algo que espera); cancelado en gris.
export const STATUS_TAG: Record<OrderStatus, string> = {
  PorEntregar: "bg-my-orange-light text-my-orange-dark",
  Entregado: "bg-my-green-light text-my-green-dark",
  Cancelado: "bg-muted text-muted-foreground",
};

export const orderTotal = (order: Pick<ApiServiceOrder, "ServiceOrderItem">) =>
  order.ServiceOrderItem.reduce(
    (sum, i) => sum + Math.round(Number(i.price) * 100) * i.quantity,
    0
  ) / 100;

// Lo pagado (anticipos y pagos menos devoluciones) y lo que resta.
export const orderPaid = (order: Pick<ApiServiceOrder, "ServiceOrderPayment">) =>
  order.ServiceOrderPayment.reduce(
    (sum, p) => sum + (p.kind === "Devolucion" ? -1 : 1) * Math.round(Number(p.amount) * 100),
    0
  ) / 100;

export const orderRest = (order: Pick<ApiServiceOrder, "ServiceOrderItem" | "ServiceOrderPayment">) =>
  Math.max(0, Math.round((orderTotal(order) - orderPaid(order)) * 100) / 100);

export const supplierName = (order: Pick<ApiServiceOrder, "Supplier">) =>
  order.Supplier.businessName || order.Supplier.name;
