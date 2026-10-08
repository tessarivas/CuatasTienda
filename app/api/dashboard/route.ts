import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";
import { storeDayRange, storeDateString } from "@/lib/store-time";
import { cutoffPeriodFor, effectiveCutoffDay } from "@/lib/suppliers/cutoff";

// Días de la gráfica de ventas (y de "Más vendidos").
const SERIES_DAYS = 30;
// Un corte de proveedor sale en pendientes si termina en estos días o menos…
const CUTOFF_AHEAD_DAYS = 7;
// …o si terminó hace estos días o menos (ya se le puede entregar).
const CUTOFF_READY_DAYS = 3;
const ACTIVITY_LIMIT = 10;

// "YYYY-MM-DD" + n días de calendario (sin zona horaria).
function addDays(date: string, n: number) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

const cents = (value: { toString(): string }) => Math.round(Number(value) * 100);

// GET /api/dashboard
// Todo lo de la página de inicio en una llamada. Sólo lectura. Los días son
// de la tienda (lib/store-time.ts), no del servidor.
//
// - today / yesterday: lo vendido (caja + liquidaciones), como el Historial
//   de Ventas.
// - series: últimos 30 días por destino del dinero (efectivo, banco y
//   apartados liquidados con saldo), para la gráfica.
// - pending: lo que alguien tiene que hacer (corte de hoy, comprobantes,
//   cortes de proveedor por entregar, clientes que ya cubren un apartado,
//   productos con una sola unidad libre).
export async function GET() {
  const today = storeDateString();
  const seriesStart = addDays(today, -(SERIES_DAYS - 1));
  const windowFrom = storeDayRange(seriesStart)!.from;
  const windowTo = storeDayRange(today)!.to;

  try {
    const [
      sales,
      reservedItems,
      products,
      pendingSales,
      pendingPayments,
      todayClosing,
      lastClosing,
      suppliers,
      recentSales,
      recentPayments,
      recentMovements,
      recentApartados,
      pendingOrders,
      pendingOrderPayments,
    ] = await Promise.all([
      prisma.sale.findMany({
        where: { date: { gte: windowFrom, lt: windowTo } },
        select: {
          date: true,
          total: true,
          paymentMethod: true,
          SaleItem: {
            select: {
              quantity: true,
              finalPrice: true,
              discount: true,
              Product: { select: { id: true, title: true } },
            },
          },
        },
      }),
      // Apartados vivos: unidad activa dentro de un apartado activo.
      prisma.layawayItem.findMany({
        where: { status: "Activo", Layaway: { status: "Activo" } },
        select: {
          price: true,
          Layaway: {
            select: { Client: { select: { id: true, name: true, currentBalance: true } } },
          },
        },
      }),
      prisma.product.findMany({
        where: { type: "PRODUCT", status: "Disponible" },
        select: {
          id: true,
          title: true,
          quantity: true,
          Supplier: { select: { name: true, businessName: true } },
          _count: {
            select: {
              LayawayItem: { where: { status: "Activo", Layaway: { status: "Activo" } } },
            },
          },
        },
      }),
      prisma.sale.findMany({
        where: {
          paymentMethod: { in: ["Tarjeta", "Transferencia"] },
          receiptUrl: null,
          ServiceOrder: { is: null },
        },
        orderBy: { date: "desc" },
        select: { id: true, folio: true, date: true, total: true, paymentMethod: true },
      }),
      prisma.payment.findMany({
        where: { kind: "Abono", method: { in: ["Tarjeta", "Transferencia"] }, receiptUrl: null },
        orderBy: { date: "desc" },
        select: {
          id: true,
          date: true,
          amount: true,
          method: true,
          Client: { select: { name: true } },
        },
      }),
      prisma.cashClosing.findUnique({
        where: { date: new Date(`${today}T00:00:00.000Z`) },
        select: { closedAt: true, User: { select: { name: true } } },
      }),
      prisma.cashClosing.findFirst({
        orderBy: { periodEnd: "desc" },
        select: { periodEnd: true },
      }),
      prisma.supplier.findMany({
        select: { id: true, name: true, businessName: true, cutoffDay: true, createdAt: true },
      }),
      prisma.sale.findMany({
        orderBy: { date: "desc" },
        take: ACTIVITY_LIMIT,
        select: {
          id: true,
          folio: true,
          date: true,
          total: true,
          paymentMethod: true,
          Client: { select: { id: true, name: true } },
          SaleItem: { select: { quantity: true } },
        },
      }),
      prisma.payment.findMany({
        orderBy: { date: "desc" },
        take: ACTIVITY_LIMIT,
        select: {
          id: true,
          date: true,
          amount: true,
          method: true,
          kind: true,
          Client: { select: { id: true, name: true } },
        },
      }),
      prisma.stockMovement.findMany({
        orderBy: { createdAt: "desc" },
        take: ACTIVITY_LIMIT,
        select: {
          id: true,
          type: true,
          quantity: true,
          createdAt: true,
          Product: { select: { title: true, supplierId: true } },
        },
      }),
      prisma.layawayItem.findMany({
        orderBy: { createdAt: "desc" },
        take: ACTIVITY_LIMIT,
        select: {
          id: true,
          createdAt: true,
          price: true,
          Product: { select: { title: true } },
          Layaway: { select: { Client: { select: { id: true, name: true } } } },
        },
      }),
      // Pedidos de servicio que esperan que los recojan (y se cobren).
      prisma.serviceOrder.findMany({
        where: { status: "PorEntregar" },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          folio: true,
          customerName: true,
          createdAt: true,
          ServiceOrderItem: { select: { price: true, quantity: true } },
        },
      }),
      prisma.serviceOrderPayment.findMany({
        where: { kind: "Abono", method: { in: ["Tarjeta", "Transferencia"] }, receiptUrl: null },
        orderBy: { date: "desc" },
        select: {
          id: true,
          date: true,
          amount: true,
          method: true,
          ServiceOrder: { select: { folio: true } },
        },
      }),
    ]);

    // --- Ventas por día y por destino del dinero ---
    const seriesMap = new Map<string, { efectivo: number; banco: number; apartados: number; count: number }>();
    for (let i = 0; i < SERIES_DAYS; i++) {
      seriesMap.set(addDays(seriesStart, i), { efectivo: 0, banco: 0, apartados: 0, count: 0 });
    }
    const byProduct = new Map<number, { title: string; units: number; cents: number }>();
    for (const sale of sales) {
      const day = seriesMap.get(storeDateString(sale.date));
      if (day) {
        const total = cents(sale.total);
        if (sale.paymentMethod === "Efectivo") day.efectivo += total;
        else if (sale.paymentMethod === null) day.apartados += total;
        else day.banco += total;
        day.count += 1;
      }
      for (const item of sale.SaleItem) {
        const prev = byProduct.get(item.Product.id);
        byProduct.set(item.Product.id, {
          title: item.Product.title,
          units: (prev?.units ?? 0) + item.quantity,
          cents:
            (prev?.cents ?? 0) + cents(item.finalPrice) * item.quantity - cents(item.discount),
        });
      }
    }
    const series = Array.from(seriesMap, ([date, d]) => ({
      date,
      efectivo: d.efectivo / 100,
      banco: d.banco / 100,
      apartados: d.apartados / 100,
      count: d.count,
    }));
    const todayPoint = series[series.length - 1];
    const yesterdayPoint = series[series.length - 2];
    const dayTotal = (p: (typeof series)[number]) => p.efectivo + p.banco + p.apartados;

    // --- Apartados: piezas, lo que falta por cobrar y quién ya cubre uno ---
    const byClient = new Map<number, { name: string; balance: number; totalCents: number; minCents: number; items: number }>();
    for (const item of reservedItems) {
      const client = item.Layaway.Client;
      const price = cents(item.price);
      const prev = byClient.get(client.id);
      byClient.set(client.id, {
        name: client.name,
        balance: cents(client.currentBalance),
        totalCents: (prev?.totalCents ?? 0) + price,
        minCents: Math.min(prev?.minCents ?? Infinity, price),
        items: (prev?.items ?? 0) + 1,
      });
    }
    let owedCents = 0;
    const coverable: { clientId: number; name: string; balance: number; items: number }[] = [];
    for (const [clientId, c] of byClient) {
      owedCents += Math.max(0, c.totalCents - c.balance);
      if (c.balance > 0 && c.balance >= c.minCents) {
        coverable.push({ clientId, name: c.name, balance: c.balance / 100, items: c.items });
      }
    }

    // --- Inventario: piezas libres y lo que está por agotarse ---
    let availablePieces = 0;
    let availableProducts = 0;
    const lowStock: { productId: number; title: string; supplier: string }[] = [];
    for (const p of products) {
      const free = (p.quantity ?? 0) - p._count.LayawayItem;
      if (free > 0) {
        availablePieces += free;
        availableProducts += 1;
      }
      if (free === 1) {
        lowStock.push({
          productId: p.id,
          title: p.title,
          supplier: p.Supplier?.businessName || p.Supplier?.name || "Sin proveedor",
        });
      }
    }
    lowStock.sort((a, b) => a.title.localeCompare(b.title, "es"));

    // --- Cortes de proveedor por entregar (recién terminados) o próximos ---
    const supplierCutoffs: {
      supplierId: number;
      name: string;
      from: string;
      to: string;
      status: "listo" | "proximo";
      days: number; // listo: hace cuántos días terminó; próximo: cuántos faltan
    }[] = [];
    for (const s of suppliers) {
      const day = effectiveCutoffDay(s.cutoffDay, storeDateString(s.createdAt));
      const current = cutoffPeriodFor(day, today);
      const name = s.businessName || s.name;
      const sinceStart = daysBetween(current.from, today);
      if (sinceStart < CUTOFF_READY_DAYS) {
        // El periodo anterior acaba de terminar: es el que se le entrega.
        const previous = cutoffPeriodFor(day, addDays(current.from, -1));
        supplierCutoffs.push({ supplierId: s.id, name, ...previous, status: "listo", days: sinceStart + 1 });
      }
      const left = daysBetween(today, current.to);
      if (left <= CUTOFF_AHEAD_DAYS) {
        supplierCutoffs.push({ supplierId: s.id, name, ...current, status: "proximo", days: left });
      }
    }
    supplierCutoffs.sort((a, b) =>
      a.status !== b.status ? (a.status === "listo" ? -1 : 1) : a.days - b.days
    );

    // --- Corte de caja de hoy ---
    // Cobros (ventas con método y abonos) desde el último cierre. Abierto:
    // son los del corte en curso. Cerrado: los que llegaron después del
    // cierre y entran al corte siguiente.
    const since = lastClosing?.periodEnd ?? null;
    const dateFilter = since ? { date: { gte: since } } : {};
    const [saleCount, paymentCount, orderPaymentCount] = await Promise.all([
      prisma.sale.count({
        where: { ...dateFilter, paymentMethod: { not: null }, ServiceOrder: { is: null } },
      }),
      prisma.payment.count({ where: dateFilter }),
      prisma.serviceOrderPayment.count({ where: dateFilter }),
    ]);
    const closing = todayClosing
      ? {
          status: "cerrado" as const,
          closedAt: todayClosing.closedAt,
          closedBy: todayClosing.User.name,
          lateCount: saleCount + paymentCount + orderPaymentCount,
        }
      : { status: "abierto" as const, since, cobros: saleCount + paymentCount + orderPaymentCount };

    // --- Actividad reciente: lo último que pasó en la tienda ---
    type Activity = {
      key: string;
      type: "venta" | "liquidacion" | "abono" | "apartado" | "alta" | "retiro";
      date: Date;
      title: string;
      detail: string;
      amount: number | null;
      href: string | null;
    };
    const activity: Activity[] = [
      ...recentSales.map<Activity>((s) => {
        const units = s.SaleItem.reduce((sum, i) => sum + i.quantity, 0);
        return {
          key: `venta-${s.id}`,
          type: s.paymentMethod ? "venta" : "liquidacion",
          date: s.date,
          title: s.paymentMethod ? `Venta ${s.folio ?? `#${s.id}`}` : `Liquidación de ${s.Client?.name ?? "cliente"}`,
          detail: `${units} ${units === 1 ? "pieza" : "piezas"} · ${s.paymentMethod ?? "Saldo"}`,
          amount: Number(s.total),
          href: s.Client && !s.paymentMethod ? `/admin/dashboard/clients/${s.Client.id}` : "/admin/dashboard/sales",
        };
      }),
      ...recentPayments.map<Activity>((p) => ({
        key: `abono-${p.id}`,
        type: "abono",
        date: p.date,
        title:
          p.kind === "Devolucion"
            ? `Devolución a ${p.Client.name}`
            : `Abono de ${p.Client.name}`,
        detail: p.method,
        amount: Number(p.amount),
        href: `/admin/dashboard/clients/${p.Client.id}`,
      })),
      ...recentApartados.map<Activity>((a) => ({
        key: `apartado-${a.id}`,
        type: "apartado",
        date: a.createdAt,
        title: `${a.Layaway.Client.name} apartó`,
        detail: a.Product.title,
        amount: Number(a.price),
        href: `/admin/dashboard/clients/${a.Layaway.Client.id}`,
      })),
      ...recentMovements.map<Activity>((m) => ({
        key: `mov-${m.id}`,
        type: m.type === "Alta" ? "alta" : "retiro",
        date: m.createdAt,
        title: m.type === "Alta" ? `Llegaron ${m.quantity} ${m.quantity === 1 ? "pieza" : "piezas"}` : `Se retiraron ${m.quantity} ${m.quantity === 1 ? "pieza" : "piezas"}`,
        detail: m.Product.title,
        amount: null,
        href: `/admin/dashboard/suppliers/${m.Product.supplierId}`,
      })),
    ]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, ACTIVITY_LIMIT);

    return NextResponse.json({
      today,
      sales: {
        todayTotal: dayTotal(todayPoint),
        todayCount: todayPoint.count,
        yesterdayTotal: dayTotal(yesterdayPoint),
      },
      reservations: {
        pieces: reservedItems.length,
        clients: byClient.size,
        owed: owedCents / 100,
      },
      inventory: { availablePieces, availableProducts },
      series,
      topProducts: Array.from(byProduct.values())
        .sort((a, b) => b.units - a.units || b.cents - a.cents)
        .slice(0, 5)
        .map((p) => ({ title: p.title, units: p.units, total: p.cents / 100 })),
      activity,
      pending: {
        closing,
        receipts: [
          ...pendingSales.map((s) => ({
            key: `venta-${s.id}`,
            label: `Venta ${s.folio ?? `#${s.id}`}`,
            method: s.paymentMethod,
            amount: Number(s.total),
            date: s.date,
          })),
          ...pendingOrderPayments.map((p) => ({
            key: `pedido-${p.id}`,
            label: `Pedido ${p.ServiceOrder.folio}`,
            method: p.method,
            amount: Number(p.amount),
            date: p.date,
          })),
          ...pendingPayments.map((p) => ({
            key: `abono-${p.id}`,
            label: `Abono de ${p.Client.name}`,
            method: p.method,
            amount: Number(p.amount),
            date: p.date,
          })),
        ].sort((a, b) => b.date.getTime() - a.date.getTime()),
        supplierCutoffs,
        coverable,
        lowStock,
        serviceOrders: pendingOrders.map((o) => ({
          id: o.id,
          folio: o.folio,
          customerName: o.customerName,
          createdAt: o.createdAt,
          total:
            o.ServiceOrderItem.reduce(
              (sum, i) => sum + Math.round(Number(i.price) * 100) * i.quantity,
              0
            ) / 100,
        })),
      },
    });
  } catch (err) {
    console.error("GET dashboard falló", err);
    return NextResponse.json({ error: "No se pudo cargar el inicio" }, { status: 500 });
  }
}
