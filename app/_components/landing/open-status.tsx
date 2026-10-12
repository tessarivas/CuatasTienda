"use client";

import * as React from "react";
import { STORE_TIME_ZONE } from "@/lib/store-time";
import { STORE_HOURS } from "@/lib/store-info";
import { cn } from "@/lib/utils";

// "5:00 P.M." a partir de la hora en formato 24 h (mayúsculas como en el
// diseño de la pastilla).
const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? "A.M." : "P.M."}`;

// Día de la semana (0 domingo) y hora decimal en la tienda, no en el
// navegador de quien visita.
function storeNow() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STORE_TIME_ZONE,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { day, hour: Number(get("hour")) + Number(get("minute")) / 60 };
}

type Tone = "open" | "soon" | "closed";

// Cuatro casos, con el texto del diseño:
// - abierto y faltando más de una hora para cerrar → verde
// - abierto y cierra en menos de una hora → amarillo
// - cerrado y abre en menos de una hora → amarillo
// - cerrado (fuera de eso) → rojo, con la hora a la que abre
function statusText(): { tone: Tone; text: string } {
  const { day, hour } = storeNow();
  const today = STORE_HOURS[day];
  if (hour >= today.open && hour < today.close) {
    return today.close - hour <= 1
      ? { tone: "soon", text: "Abierto Ahora · Cerramos En Una Hora" }
      : { tone: "open", text: `Abierto Ahora · Cerramos A Las ${hourLabel(today.close)}` };
  }
  // Antes de abrir hoy, o ya cerrado: la siguiente apertura es hoy o mañana.
  const nextOpen = hour < today.open ? today.open : STORE_HOURS[(day + 1) % 7].open;
  const hoursUntil = hour < today.open ? today.open - hour : 24 - hour + nextOpen;
  return hoursUntil <= 1
    ? { tone: "soon", text: "Cerrado Ahora · Abriremos En Una Hora" }
    : { tone: "closed", text: `Cerrado Ahora · Abrimos A Las ${hourLabel(nextOpen)}` };
}

const TONE_DOT: Record<Tone, string> = {
  open: "bg-my-green",
  soon: "bg-my-yellow",
  closed: "bg-my-red",
};

// Pastilla de la portada: abierto, por cerrar/abrir o cerrado según el
// horario de la tienda.
// Se calcula después de montar (la hora del servidor no sirve) y se
// actualiza cada minuto.
export function OpenStatus() {
  const [status, setStatus] = React.useState<{ tone: Tone; text: string } | null>(null);

  React.useEffect(() => {
    const update = () => setStatus(statusText());
    update();
    const id = window.setInterval(update, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-black transition-opacity",
        !status && "opacity-0"
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", status ? TONE_DOT[status.tone] : "bg-black/20")} />
      {status?.text ?? "Horario"}
    </span>
  );
}
