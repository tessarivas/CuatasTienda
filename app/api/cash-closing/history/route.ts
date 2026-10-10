import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";

// GET /api/cash-closing/history?from=YYYY-MM-DD&to=YYYY-MM-DD
// Cortes cerrados, más recientes primero, con cuántos comprobantes de
// tarjeta/transferencia siguen pendientes en su ventana. Con from/to (días
// de la tienda, ambos inclusive, por la fecha del corte): los de ese periodo,
// para sumar sus totales en "Cortes anteriores". Sin ellos: los últimos 90.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const DATE = /^\d{4}-\d{2}-\d{2}$/;
  if ((from && !DATE.test(from)) || (to && !DATE.test(to)) || (from && to && from > to)) {
    return NextResponse.json({ error: "Rango de fechas inválido" }, { status: 400 });
  }
  const dateFilter =
    from || to
      ? {
          date: {
            ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
            ...(to ? { lte: new Date(`${to}T00:00:00.000Z`) } : {}),
          },
        }
      : {};

  try {
    const closings = await prisma.cashClosing.findMany({
      where: dateFilter,
      orderBy: { periodEnd: "desc" },
      take: from || to ? undefined : 90,
      include: { User: { select: { name: true } } },
    });

    const withPending = await Promise.all(
      closings.map(async (c) => {
        const window = { gte: c.periodStart, lt: c.periodEnd };
        const [sales, payments, orderPayments] = await Promise.all([
          prisma.sale.count({
            where: {
              date: window,
              paymentMethod: { in: ["Tarjeta", "Transferencia"] },
              receiptUrl: null,
              ServiceOrder: { is: null },
            },
          }),
          prisma.payment.count({
            where: {
              date: window,
              kind: "Abono",
              method: { in: ["Tarjeta", "Transferencia"] },
              receiptUrl: null,
            },
          }),
          prisma.serviceOrderPayment.count({
            where: {
              date: window,
              kind: "Abono",
              method: { in: ["Tarjeta", "Transferencia"] },
              receiptUrl: null,
            },
          }),
        ]);
        return { ...c, pendingReceipts: sales + payments + orderPayments };
      })
    );

    return NextResponse.json(withPending);
  } catch (err) {
    console.error("GET historial de cortes falló", err);
    return NextResponse.json(
      { error: "No se pudo cargar el historial de cortes" },
      { status: 500 }
    );
  }
}
