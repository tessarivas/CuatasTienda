"use client";

import { motion } from "motion/react";
import { DOT, MARQUEE, MARQUEE_COLORS } from "./content";
import { cn } from "@/lib/utils";

// Cinta negra que corre sola debajo de la portada. Cada mitad repite la
// lista 3 veces (más ancha que cualquier pantalla, para que nunca quede un
// hueco a la derecha) y se mueve exactamente la mitad: al reiniciar, la
// segunda mitad está donde empezó la primera y el salto no se nota.
//
// Los puntitos alternan amarillo, azul, rojo por posición. Con 7 textos la
// lista sola no cuadra con 3 colores (al repetirse quedaban dos amarillos
// juntos); con 3 copias cada mitad tiene 21, múltiplo de 3, y el ciclo no se
// rompe ni al empalmar las copias ni al reiniciar.
const COPIES = 3;

export function Marquee() {
  const half = Array.from({ length: COPIES }, () => MARQUEE).flat();
  const items = [...half, ...half];
  return (
    <div className="overflow-hidden bg-black py-3 text-white" aria-label="Lo que encuentras en Cuatas">
      <motion.ul
        className="flex w-max items-center gap-8 pr-8 text-sm font-medium whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 30 * COPIES, ease: "linear", repeat: Infinity }}
      >
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-8" aria-hidden={i >= MARQUEE.length || undefined}>
            <span className={cn("h-1.5 w-1.5 rounded-full", DOT[MARQUEE_COLORS[i % MARQUEE_COLORS.length]])} />
            {item}
          </li>
        ))}
      </motion.ul>
    </div>
  );
}
