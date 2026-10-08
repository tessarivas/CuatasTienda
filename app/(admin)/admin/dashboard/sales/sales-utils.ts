// Forma de GET /api/sales. Decimal llega como string; Client es null en
// ventas de caja; paymentMethod es null en liquidaciones (pagadas con saldo).
export type ApiSaleRow = {
  id: number;
  folio: string | null;
  date: string;
  total: string;
  discount: string;
  paymentMethod: "Efectivo" | "Tarjeta" | "Transferencia" | null;
  receiptUrl: string | null;
  Client: { id: number; name: string } | null;
  User: { name: string };
  ServiceOrder: { folio: string } | null;
  SaleItem: {
    id: number;
    quantity: number;
    finalPrice: string;
    discount: string;
    // Descripción propia cuando la venta viene de un pedido de servicio.
    description: string | null;
    Promotion: { name: string | null } | null;
    Product: {
      id: number;
      title: string;
      type: "PRODUCT" | "SERVICE";
      Supplier: { businessName: string | null } | null;
    };
  }[];
};

// "Saldo" para liquidaciones: el dinero real entró antes como abono (con su
// propio método), aquí sólo se usó el saldo del cliente.
export const methodLabel = (method: ApiSaleRow["paymentMethod"]) =>
  method ?? "Saldo";

// De dónde vino la venta: caja, liquidación de un apartado o pedido de servicio.
export const saleOrigin = (sale: Pick<ApiSaleRow, "Client" | "ServiceOrder">) =>
  sale.ServiceOrder
    ? `Pedido ${sale.ServiceOrder.folio}`
    : sale.Client
      ? sale.Client.name
      : "Caja";

export const formatMoney = (amount: number) =>
  `$${amount.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const formatSaleDate = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
