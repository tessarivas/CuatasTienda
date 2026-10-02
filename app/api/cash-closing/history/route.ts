import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";

// GET /api/cash-closing/history
// Cortes cerrados, más recientes primero (los últimos 90), con cuántos
// comprobantes de tarjeta/transferencia siguen pendientes en su ventana.
export async function GET() {
  try {
    const closings = await prisma.cashClosing.findMany({
      orderBy: { periodEnd: "desc" },
      take: 90,
      include: { User: { select: { name: true } } },
    });

    const withPending = await Promise.all(
      closings.map(async (c) => {
        const window = { gte: c.periodStart, lt: c.periodEnd };
        const [sales, payments] = await Promise.all([
          prisma.sale.count({
            where: {
              date: window,
              paymentMethod: { in: ["Tarjeta", "Transferencia"] },
              receiptUrl: null,
            },
          }),
          prisma.payment.count({
            where: {
              date: window,
              method: { in: ["Tarjeta", "Transferencia"] },
              receiptUrl: null,
            },
          }),
        ]);
        return { ...c, pendingReceipts: sales + payments };
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
