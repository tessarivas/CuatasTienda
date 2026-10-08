import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";
import { storeDayRange, storeDateString } from "@/lib/store-time";

// GET /api/receipts/pending
// Cuántos cobros con tarjeta o transferencia de días anteriores siguen sin
// comprobante (ventas de caja y abonos). Los de hoy no cuentan: todavía se
// pueden adjuntar en el corte de hoy. Lo usa el aviso que sale al entrar al
// panel; el detalle está en "Pendientes" del inicio y en Corte de Caja.
export async function GET() {
  const startOfToday = storeDayRange(storeDateString())!.from;
  const bank = { in: ["Tarjeta" as const, "Transferencia" as const] };
  try {
    const [sales, payments, orderPayments] = await Promise.all([
      prisma.sale.count({
        where: {
          paymentMethod: bank,
          receiptUrl: null,
          date: { lt: startOfToday },
          ServiceOrder: { is: null },
        },
      }),
      prisma.payment.count({
        where: { kind: "Abono", method: bank, receiptUrl: null, date: { lt: startOfToday } },
      }),
      prisma.serviceOrderPayment.count({
        where: { kind: "Abono", method: bank, receiptUrl: null, date: { lt: startOfToday } },
      }),
    ]);
    return NextResponse.json({ count: sales + payments + orderPayments });
  } catch (err) {
    console.error("GET comprobantes pendientes falló", err);
    return NextResponse.json(
      { error: "No se pudieron contar los comprobantes pendientes" },
      { status: 500 }
    );
  }
}
