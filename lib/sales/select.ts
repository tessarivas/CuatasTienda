import { Prisma } from "@/generated/prisma/client";

// Forma de una venta para la pantalla: la usan el Historial de Ventas
// (GET /api/sales), la respuesta al cobrar en caja (POST /api/sales) y la de
// "Entregar y cobrar" un pedido de servicio, para que el ticket (vista previa
// e impresión) se arme igual en todos lados. `description` es la del
// renglón cuando viene de un pedido de servicio.
export const SALE_ROW_SELECT = {
  id: true,
  folio: true,
  date: true,
  total: true,
  discount: true,
  paymentMethod: true,
  receiptUrl: true,
  Client: { select: { id: true, name: true } },
  User: { select: { name: true } },
  // Si la venta es de un pedido de servicio (se creó al quedar pagado).
  ServiceOrder: { select: { folio: true } },
  SaleItem: {
    select: {
      id: true,
      quantity: true,
      finalPrice: true,
      discount: true,
      description: true,
      // Si el descuento del renglón fue de una promoción del proveedor.
      Promotion: { select: { name: true } },
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
