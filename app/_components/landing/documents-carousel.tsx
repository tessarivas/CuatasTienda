"use client";

import * as React from "react";
import Image from "next/image";
import { DOCUMENTS } from "./content";
import { cn } from "@/lib/utils";

// Fila de documentos que se desliza de lado, con una barrita debajo que
// muestra cuánto se ha recorrido. Como en el diseño, la fila arranca
// centrada en la pantalla (las orillas se asoman cortadas a los lados) y cada
// tarjeta se acomoda al centro al soltarla. En pantallas donde caben todas,
// first:ml-auto / last:mr-auto las dejan centradas. Desde md sin imán: con 4
// tarjetas el centro cae entre la 2 y la 3, que no es punto de imán, y el
// navegador regresaría la fila a la orilla.
export function DocumentsCarousel() {
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const [progress, setProgress] = React.useState({ start: 0, size: 1 });

  const update = React.useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const size = el.scrollWidth > 0 ? el.clientWidth / el.scrollWidth : 1;
    const max = el.scrollWidth - el.clientWidth;
    const start = max > 0 ? (el.scrollLeft / max) * (1 - size) : 0;
    setProgress({ start, size });
  }, []);

  React.useEffect(() => {
    const el = scrollerRef.current;
    if (el) {
      // Arranca a la mitad del recorrido, sin animación.
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update]);

  return (
    <div>
      <div
        ref={scrollerRef}
        onScroll={update}
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto md:snap-none px-4 pb-4 [scrollbar-width:none] md:gap-8"
      >
        {DOCUMENTS.map((doc) => (
          <article key={doc.title} className="w-72 shrink-0 snap-center first:ml-auto last:mr-auto md:w-96">
            <div className="relative aspect-4/3 overflow-hidden rounded-sm border-2 border-black bg-white shadow-[6px_6px_0_0_#000]">
              <Image
                src={doc.image}
                alt={`Ejemplo de ${doc.title}`}
                fill
                sizes="384px"
                className="object-cover object-center"
              />
            </div>
            <h3 className="mt-4 text-sm font-bold uppercase">{doc.title}</h3>
            <p className="text-sm">{doc.time}</p>
            <p className="text-sm">{doc.format}</p>
          </article>
        ))}
      </div>
      <div
        className={cn(
          "mx-auto mt-4 h-1 w-48 overflow-hidden rounded-full bg-black/10 md:w-72",
          progress.size >= 1 && "invisible"
        )}
        aria-hidden
      >
        <div
          className="h-full rounded-full bg-black transition-[margin] duration-150"
          style={{ width: `${progress.size * 100}%`, marginLeft: `${progress.start * 100}%` }}
        />
      </div>
    </div>
  );
}
