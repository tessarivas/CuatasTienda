"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";

// Imagen de la portada flotando: sube y baja despacio con un leve giro, en
// ciclo. Quien pidió menos movimiento en su sistema la ve quieta. La imagen
// es de la temporada (SEASON.hero en content.ts).
export function FloatingHero({
  src,
  alt,
  width,
  height,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="mx-auto w-2/3 max-w-sm md:w-full"
      animate={reduce ? undefined : { y: [0, -18, 0], rotate: [0, 1.5, 0] }}
      transition={{ duration: 6, ease: "easeInOut", repeat: Infinity }}
    >
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority
        className="h-auto w-full drop-shadow-2xl"
      />
    </motion.div>
  );
}
