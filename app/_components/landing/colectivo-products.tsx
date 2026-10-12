"use client";

import * as React from "react";
import Image from "next/image";
import { Package } from "lucide-react";
import { money } from "./content";
import { cn } from "@/lib/utils";

// Lo que regresa GET /api/products?view=public (catálogo público).
type PublicProduct = {
  id: number;
  title: string;
  price: string;
  picture: string | null;
  type: "PRODUCT" | "SERVICE";
  supplier: string | null;
};

const ALL = "__todas__";
// Mínimo de tarjetas por vuelta: con pocos productos se repiten para que la
// fila siempre llene la pantalla y el ciclo no deje huecos.
const MIN_PER_LAP = 10;
const SECONDS_PER_CARD = 4;

// Productos de las marcas locales que hay ahora en la tienda (catálogo
// público: sólo productos a la venta, sin servicios). Chips para filtrar por
// proveedor y una fila que corre sola en ciclo; se detiene al pasar el
// mouse. Si no hay productos o falla, la sección queda sólo con su título.
export function ColectivoProducts() {
  const [products, setProducts] = React.useState<PublicProduct[] | null>(null);
  const [supplier, setSupplier] = React.useState(ALL);

  React.useEffect(() => {
    let cancelled = false;
    // view=public: la proyección recortada aunque quien visite tenga sesión.
    fetch("/api/products?view=public")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: PublicProduct[]) => {
        if (!cancelled) setProducts(data.filter((p) => p.type === "PRODUCT"));
      })
      .catch(() => !cancelled && setProducts([]));
    return () => {
      cancelled = true;
    };
  }, []);

  const suppliers = React.useMemo(
    () =>
      [...new Set((products ?? []).map((p) => p.supplier).filter((s): s is string => !!s))].sort(
        (a, b) => a.localeCompare(b, "es")
      ),
    [products]
  );
  const visible = (products ?? []).filter((p) => supplier === ALL || p.supplier === supplier);

  if (products === null) {
    return (
      <div className="flex gap-4 overflow-hidden px-4 md:px-8">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="aspect-square w-48 shrink-0 animate-pulse rounded-3xl bg-black/5 md:w-56" />
        ))}
      </div>
    );
  }
  if (products.length === 0) return null;

  // Una vuelta = los productos repetidos hasta llenar; la pista lleva dos
  // vueltas y se mueve exactamente una (-50%), así el reinicio no se nota.
  const reps = Math.max(1, Math.ceil(MIN_PER_LAP / Math.max(visible.length, 1)));
  const lap = Array.from({ length: reps }, () => visible).flat();
  const track = [...lap, ...lap];

  return (
    <div>
      <div className="mx-auto flex w-full max-w-7xl flex-wrap gap-2 px-4 md:px-8">
        {[ALL, ...suppliers].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSupplier(s)}
            className={cn(
              "h-9 cursor-pointer rounded-full border px-4 text-sm font-medium transition-colors",
              supplier === s ? "border-black bg-black text-white" : "border-black/15 hover:border-black"
            )}
          >
            {s === ALL ? "Todas" : s}
          </button>
        ))}
      </div>

      <div className="mt-8 overflow-hidden">
        <div
          // key: al cambiar de proveedor la fila vuelve a empezar.
          key={supplier}
          // La duración va en una variable y la animación en una clase (no en
          // style), para que hover:paused y motion-reduce puedan ganarle.
          className="flex w-max gap-4 pl-4 [animation:landing-marquee_var(--lap)_linear_infinite] hover:paused motion-reduce:animate-none"
          style={{ "--lap": `${lap.length * SECONDS_PER_CARD}s` } as React.CSSProperties}
        >
          {track.map((p, i) => (
            <article key={`${p.id}-${i}`} className="w-48 shrink-0 md:w-56" aria-hidden={i >= visible.length || undefined}>
              <div className="relative aspect-square overflow-hidden rounded-3xl bg-black/5">
                {p.picture ? (
                  <Image src={p.picture} alt={p.title} fill sizes="224px" className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Package className="h-10 w-10 text-black/30" />
                  </div>
                )}
              </div>
              <h3 className="mt-3 line-clamp-2 text-sm font-semibold leading-5" title={p.title}>
                {p.title}
              </h3>
              <p className="text-xs text-black/60">{p.supplier}</p>
              <p className="font-bold">{money(Number(p.price))}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
