"use client";

import * as React from "react";
import Image from "next/image";
import { Check, TreePine } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_PRICED_PRODUCT,
  PRICED_PRODUCTS,
  SEASON,
  type PricedProduct,
  money,
} from "./content";

// Bloque gris para lo que todavía no tiene foto o dato (ver content.ts).
function Gray({ className }: { className?: string }) {
  return <div aria-hidden className={cn("rounded-2xl bg-black/5", className)} />;
}

// Sólo salen las pestañas que ya tienen precios; las demás (Termos,
// Botellas, Llaveros, Gorros) aparecen solas en cuanto se llenen en
// content.ts.
const READY_PRODUCTS = PRICED_PRODUCTS.filter((p) => p.tiers.length > 0);

// "Entre más pides, menos pagas": pestañas por producto con fotos, lo que
// incluye, colores y precios por cantidad. Las miniaturas cambian la foto
// grande.
export function PricingTabs() {
  const [key, setKey] = React.useState(DEFAULT_PRICED_PRODUCT);
  const product = READY_PRODUCTS.find((p) => p.key === key) ?? READY_PRODUCTS[0];

  return (
    <div>
      {/* Pestañas: en celular una fila que se desliza de lado. */}
      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0">
        <div className="flex w-max gap-2 md:w-auto md:flex-wrap">
          {READY_PRODUCTS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setKey(p.key)}
              className={cn(
                "h-9 shrink-0 cursor-pointer rounded-full border px-4 text-sm font-medium transition-colors",
                p.key === product.key ? "border-black bg-black text-white" : "border-black/15 hover:border-black"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* key: al cambiar de producto se vuelve a la primera foto. */}
      <ProductPanel key={product.key} product={product} />
    </div>
  );
}

// Colores por rango de tallas. El nombre de cada color sale en una
// etiqueta: al pasar el cursor en compu, o al tocarlo en el celular (otro
// toque, o tocar fuera, la cierra). Sólo una abierta a la vez. Cerca de la
// orilla de la pantalla la etiqueta se alinea hacia adentro para no salirse.
type Open = { id: string; align: "center" | "left" | "right" };

function ColorRows({ rows }: { rows: PricedProduct["colors"] }) {
  const [open, setOpen] = React.useState<Open | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest("[data-swatch]")) setOpen(null);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const show = (id: string, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const mid = r.left + r.width / 2;
    const align = mid < 90 ? "left" : mid > window.innerWidth - 90 ? "right" : "center";
    setOpen({ id, align });
  };

  return (
    <dl className="mt-3 space-y-4">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <dt className="shrink-0 text-sm sm:w-36 sm:pt-1.5">
            <span className="font-medium">{row.label}</span>
            {row.sizes && <span className="block text-xs text-black/50">{row.sizes}</span>}
          </dt>
          <dd className="flex flex-wrap gap-2">
            {row.swatches.map((s) => {
              const id = `${row.label}-${s.name}`;
              const active = open?.id === id ? open : null;
              return (
                <span key={id} data-swatch className="relative">
                  <button
                    type="button"
                    aria-label={s.name}
                    onPointerEnter={(e) => e.pointerType === "mouse" && show(id, e.currentTarget)}
                    onPointerLeave={(e) =>
                      e.pointerType === "mouse" && setOpen((cur) => (cur?.id === id ? null : cur))
                    }
                    // En el celular un segundo toque la cierra; con cursor
                    // ya se abrió al pasar encima y el clic no la quita.
                    onClick={(e) => {
                      if (active && !matchMedia("(hover: hover)").matches) setOpen(null);
                      else show(id, e.currentTarget);
                    }}
                    className={cn(
                      "block h-8 w-8 cursor-pointer rounded-full border border-black/15 transition-transform hover:scale-110",
                      active && "ring-2 ring-black ring-offset-2"
                    )}
                    style={{ backgroundColor: s.hex }}
                  />
                  {active && (
                    <span
                      role="tooltip"
                      className={cn(
                        "pointer-events-none absolute bottom-full z-10 mb-2 rounded-full bg-black px-3 py-1 text-xs font-medium whitespace-nowrap text-white shadow-lg",
                        active.align === "center" && "left-1/2 -translate-x-1/2",
                        active.align === "left" && "left-0",
                        active.align === "right" && "right-0"
                      )}
                    >
                      {s.name}
                    </span>
                  )}
                </span>
              );
            })}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ProductPanel({ product }: { product: PricedProduct }) {
  const [main, setMain] = React.useState(0);
  const mainImage = product.images[main] ?? null;

  return (
    <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
      {/* Fotos: desde lg la columna mide lo mismo que la de datos (la foto
          grande crece o se encoge para llenarla) y ambas terminan parejas. */}
      <div className="flex flex-col">
        <div className="relative aspect-square overflow-hidden rounded-3xl bg-black/5 lg:aspect-auto lg:min-h-80 lg:flex-1">
          {mainImage && (
            <Image
              src={mainImage}
              alt={product.label}
              fill
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-cover"
            />
          )}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {/* Las miniaturas incluyen la foto grande (marcada), como en el diseño. */}
          {product.images.map((img, index) => {
            return (
              <button
                key={index}
                type="button"
                disabled={!img}
                onClick={() => setMain(index)}
                aria-label={`Ver foto ${index + 1}`}
                className={cn(
                  "relative aspect-4/3 overflow-hidden rounded-2xl bg-black/5",
                  img && "cursor-pointer",
                  main === index && "ring-2 ring-black ring-offset-2"
                )}
              >
                {img && <Image src={img} alt="" fill sizes="200px" className="object-cover" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Datos */}
      <div className="space-y-8">
        <div>
          <h3 className="text-sm font-extrabold uppercase">Te ofrecemos</h3>
          {product.offers.length > 0 ? (
            <ul className="mt-3 space-y-2.5">
              {product.offers.map((o) => (
                <li key={o} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black text-white">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {o}
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3 space-y-2.5">
              <Gray className="h-5 w-4/5" />
              <Gray className="h-5 w-3/5" />
              <Gray className="h-5 w-2/3" />
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-extrabold uppercase">Colores disponibles</h3>
          {product.colors.length > 0 ? (
            <ColorRows rows={product.colors} />
          ) : (
            <Gray className="mt-3 h-8 w-3/4" />
          )}
        </div>

        <div>
          <h3 className="text-sm font-extrabold uppercase">Precios</h3>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {product.tiers.length > 0
              ? product.tiers.map((t) => (
                  <div
                    key={t.label}
                    className={cn(
                      "rounded-2xl border p-4 md:p-5",
                      t.best ? "border-black bg-black text-white" : "border-black/10"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn("text-sm", t.best ? "text-white/80" : "text-black/60")}>{t.label}</span>
                      {t.best && (
                        <span className="rounded-full bg-my-yellow px-2 py-0.5 text-[10px] font-semibold text-black sm:text-xs">
                          Mejor precio
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-2xl font-extrabold md:text-4xl">
                      {money(t.price)}
                      {t.perUnit && <span className="ml-1 text-sm font-medium">c/u</span>}
                    </p>
                  </div>
                ))
              : Array.from({ length: 4 }, (_, i) => <Gray key={i} className="h-24 md:h-32" />)}
          </div>

          <div className="mt-3 rounded-2xl bg-my-red px-5 py-4 text-white">
            <p className="flex items-center gap-2 text-sm font-extrabold uppercase">
              <TreePine className="h-4 w-4" />
              {SEASON.deadlines.title}
            </p>
            {SEASON.deadlines.lines.map((l) => (
              <p key={l} className="mt-1 text-sm">
                {l}
              </p>
            ))}
          </div>

          {product.note && <p className="mt-6 text-sm text-black/60">{product.note}</p>}
        </div>
      </div>
    </div>
  );
}
