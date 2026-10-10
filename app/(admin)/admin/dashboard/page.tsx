"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Clock, Loader2, Lock, Package, ShoppingCart, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StatCard, STAT_ROW } from "./_components/stat-card";
import { SalesFlowCard } from "./_components/home/sales-flow-card";
import { PendingCard } from "./_components/home/pending-card";
import { ActivityCard } from "./_components/home/activity-card";
import { TopProductsCard } from "./_components/home/top-products-card";
import { type DashboardData, money } from "./_components/home/types";

// Saludo y fecha según la hora de quien ve la página (la de la tienda). Se
// calculan después de montar, como useTodayLabel, para no chocar con el
// render del servidor (UTC).
function useGreeting() {
  const [greeting, setGreeting] = React.useState({ hello: "Hola", date: "" });
  React.useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    const date = now.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
    setGreeting({
      hello: hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches",
      date: date.charAt(0).toUpperCase() + date.slice(1),
    });
  }, []);
  return greeting;
}

// Entrada escalonada de las secciones.
const fadeUp = (i: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay: i * 0.06 },
});

export default function DashboardHome() {
  const { hello, date } = useGreeting();
  const [name, setName] = React.useState("");
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((me: { name?: string } | null) => setName(me?.name?.trim() ?? ""))
      .catch(() => {});
    fetch("/api/dashboard")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  const diff = data ? data.sales.todayTotal - data.sales.yesterdayTotal : 0;

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-col md:flex-row md:items-center md:gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {hello}
            {name && `, ${name}`}
          </h1>
          <p className="text-sm text-muted-foreground">
            {date ? `${date}. Esto es lo que pasa hoy en la tienda.` : " "}
          </p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 md:mt-0 md:ml-auto md:flex md:items-center">
          <Button variant="outline" className="cursor-pointer" asChild>
            <Link href="/admin/dashboard/cash-closing">
              <Lock />
              Corte de Caja
            </Link>
          </Button>
          <Button className="cursor-pointer" asChild>
            <Link href="/admin/dashboard/pos">
              <ShoppingCart />
              Nueva venta
            </Link>
          </Button>
        </div>
      </div>

      {failed ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No se pudo cargar el inicio. Recarga la página para intentar de nuevo.
        </p>
      ) : !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Arriba: las tres tarjetas de resumen apiladas (se estiran al
              alto de la gráfica) y, a su derecha, la gráfica de ventas. */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <motion.div
              className={cn(STAT_ROW, "lg:grid-cols-1 lg:grid-rows-3")}
              {...fadeUp(0)}
            >
              <StatCard
                color="yellow"
                icon={Wallet}
                title="Vendido hoy"
                value={money(data.sales.todayTotal)}
                hint={`${data.sales.todayCount} ${data.sales.todayCount === 1 ? "venta" : "ventas"}. ${
                  diff === 0
                    ? "Igual que ayer"
                    : `${money(Math.abs(diff))} ${diff > 0 ? "más" : "menos"} que ayer`
                }`}
              />
              <StatCard
                color="blue"
                icon={Clock}
                title="Apartados activos"
                value={`${data.reservations.pieces} ${data.reservations.pieces === 1 ? "pieza" : "piezas"}`}
                hint={`${money(data.reservations.owed)} por cobrar a ${data.reservations.clients} ${
                  data.reservations.clients === 1 ? "cliente" : "clientes"
                }`}
              />
              <StatCard
                color="pink"
                icon={Package}
                title="En tienda"
                value={`${data.inventory.availablePieces} ${data.inventory.availablePieces === 1 ? "pieza" : "piezas"}`}
                hint={`${data.inventory.availableProducts} ${
                  data.inventory.availableProducts === 1 ? "producto" : "productos"
                } con unidades libres`}
              />
            </motion.div>
            <motion.div className="lg:col-span-2" {...fadeUp(1)}>
              <SalesFlowCard series={data.series} />
            </motion.div>
          </div>

          {/* Abajo: pendientes, más vendidos y actividad, los tres del mismo
              alto (fijo en pantallas grandes); lo que no cabe scrollea dentro
              de cada tarjeta, como el historial del cliente. */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:grid-rows-[28rem]">
            <motion.div className="min-h-0" {...fadeUp(2)}>
              <PendingCard pending={data.pending} />
            </motion.div>
            <motion.div className="min-h-0" {...fadeUp(3)}>
              <TopProductsCard products={data.topProducts} />
            </motion.div>
            <motion.div className="min-h-0" {...fadeUp(4)}>
              <ActivityCard activity={data.activity} />
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
