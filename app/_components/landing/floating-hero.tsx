"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";

// Sudadera y taza de la portada flotando: sube y baja despacio con un leve
// giro, en ciclo. Quien pidió menos movimiento en su sistema la ve quieta.
export function FloatingHero() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="mx-auto w-2/3 max-w-sm md:w-full"
      animate={reduce ? undefined : { y: [0, -18, 0], rotate: [0, 1.5, 0] }}
      transition={{ duration: 6, ease: "easeInOut", repeat: Infinity }}
    >
      <Image
        src="/landing/hero.webp"
        alt="Sudadera roja y taza blanca con el texto Tu diseño aquí"
        width={900}
        height={1190}
        priority
        className="h-auto w-full drop-shadow-2xl"
      />
    </motion.div>
  );
}
