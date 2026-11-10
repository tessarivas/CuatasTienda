"use client";

import * as React from "react";
import Image from "next/image";
import { motion, useAnimationFrame, useMotionValue, useReducedMotion } from "motion/react";
import { IDEAS } from "./content";

// Píxeles por segundo: despacio, para que alcance a verse cada foto.
const SPEED = 40;

// "Tú traes la idea": las fotos corren solas de derecha a izquierda, sin fin.
// La lista va dos veces seguidas; al recorrer una copia completa se regresa
// exactamente ese ancho y el salto no se nota. Se detiene mientras el cursor
// (o el dedo) está encima, para ver una foto con calma. Quien pidió menos
// movimiento en su sistema la ve quieta y la desliza a mano.
export function IdeasCarousel() {
  const reduce = useReducedMotion();
  const track = React.useRef<HTMLUListElement>(null);
  const paused = React.useRef(false);
  const x = useMotionValue(0);

  useAnimationFrame((_, delta) => {
    if (reduce || paused.current || !track.current) return;
    const half = track.current.scrollWidth / 2;
    let next = x.get() - (SPEED * delta) / 1000;
    if (next <= -half) next += half;
    x.set(next);
  });

  const items = reduce ? IDEAS : [...IDEAS, ...IDEAS];

  return (
    <div
      className={reduce ? "overflow-x-auto [scrollbar-width:none]" : "overflow-hidden"}
      onPointerEnter={() => (paused.current = true)}
      onPointerLeave={() => (paused.current = false)}
    >
      <motion.ul ref={track} style={{ x }} className="flex w-max">
        {items.map((idea, i) => (
          <li
            key={i}
            aria-hidden={i >= IDEAS.length || undefined}
            className="aspect-4/5 w-[60vw] shrink-0 pr-1 sm:w-[40vw] md:w-[20vw]"
          >
            <div className="relative h-full w-full bg-black/5">
              <Image
                src={idea.image}
                alt={i >= IDEAS.length ? "" : idea.alt}
                fill
                sizes="(min-width: 768px) 20vw, (min-width: 640px) 40vw, 60vw"
                className="object-cover"
              />
            </div>
          </li>
        ))}
      </motion.ul>
    </div>
  );
}
