import type { Metadata } from "next";
import Image from "next/image";
import { Poppins } from "next/font/google";
import { ArrowUpRight, AtSign, Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { STORE_HOURS_LABEL, STORE_INFO } from "@/lib/store-info";
import { cn } from "@/lib/utils";
import { LandingNav } from "./_components/landing/landing-nav";
import { OpenStatus } from "./_components/landing/open-status";
import { Marquee } from "./_components/landing/marquee";
import { DocumentsCarousel } from "./_components/landing/documents-carousel";
import { ColectivoProducts } from "./_components/landing/colectivo-products";
import { FloatingHero } from "./_components/landing/floating-hero";
import {
  type BrandColor,
  CATEGORIES,
  DOT,
  ORDER_STEPS,
  PRICE_TEXT,
  STEP_NUMBER,
  money,
} from "./_components/landing/content";

// Página pública de la tienda (versión 2): vitrina, no tienda en línea. Todo
// invita a ir, llamar o escribir por WhatsApp. El panel sigue en /admin.
//
// Tipografía Poppins sólo aquí (el panel usa Inter); los colores son los
// tokens my-* de la marca.
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "Cuatas Tienda · Impresiones, personalizados y colectivo en San Quintín",
  description:
    "Imprimimos actas de nacimiento, CURP, NSS y más al momento. Personalizamos playeras, sudaderas, tazas y termos con tu diseño. Productos de marcas locales y apartados con abonos.",
};

const ADDRESS = `${STORE_INFO.addressLine1}, San Quintín 22940`;
const MAP_QUERY = encodeURIComponent(`${STORE_INFO.addressLine1}, ${STORE_INFO.addressLine2}`);

const CONTAINER = "mx-auto w-full max-w-7xl px-4 md:px-8";

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-3xl font-extrabold tracking-tight capitalize md:text-5xl">{title}</h2>
      <p className="mt-1 text-sm text-black/70">{subtitle}</p>
    </div>
  );
}

// Renglones negros con el número en un círculo de color (Cómo pedir).
function Steps({ steps }: { steps: { text: string; color: BrandColor }[] }) {
  return (
    <ol className="mt-8 space-y-3">
      {steps.map((step, i) => (
        <li
          key={step.text}
          className="flex items-center justify-center gap-3 rounded-3xl bg-black px-5 py-4 text-center text-sm font-bold text-white uppercase md:rounded-full md:py-5"
        >
          <span
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm",
              STEP_NUMBER[step.color]
            )}
          >
            {i + 1}
          </span>
          {step.text}
        </li>
      ))}
    </ol>
  );
}

function WhatsAppButton({ label, className }: { label: string; className?: string }) {
  return (
    <a
      href={STORE_INFO.whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black px-5 text-sm font-medium transition-colors hover:bg-black hover:text-white",
        className
      )}
    >
      <MessageCircle className="h-4 w-4" />
      {label}
    </a>
  );
}

export default function LandingPage() {
  return (
    <div className={cn("bg-white text-black", poppins.className)}>
      <LandingNav />

      <main>
        {/* Portada */}
        <section id="inicio" className="relative overflow-hidden bg-black text-white">
          {/* Resplandor de colores abajo, como en el diseño. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-3/4"
            style={{
              background:
                "radial-gradient(60% 60% at 15% 100%, rgba(49,133,252,0.75), transparent 70%), radial-gradient(50% 55% at 55% 100%, rgba(254,94,65,0.7), transparent 70%), radial-gradient(45% 55% at 90% 100%, rgba(155,93,229,0.7), transparent 70%)",
            }}
          />
          <div className={cn(CONTAINER, "relative grid grid-cols-1 items-center gap-6 py-10 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:py-16")}>
            <div>
              <OpenStatus />
              <h1 className="mt-5 text-[2.4rem] leading-[0.95] font-extrabold tracking-tight capitalize sm:text-6xl lg:text-8xl">
                Personalizados,
                <br />
                impresiones,
                <br />y colectivo.
              </h1>
              <p className="mt-5 max-w-xl text-sm text-white/85 md:text-base">
                Imprimimos tus documentos al momento: Actas de nacimiento, CURP, NSS y más.
                Personalizamos playeras, sudaderas, tazas y termos con tu diseño. Y en el mismo
                local encuentras productos de marcas locales.
              </p>
            </div>
            <FloatingHero />
          </div>
        </section>

        <Marquee />

        {/* Personalizados */}
        <section id="personalizados" className="scroll-mt-14 py-14 md:py-20">
          <div className={CONTAINER}>
            <SectionTitle title="Tú traes la idea, nosotros la imprimimos" subtitle="Para todos los gustos y medidas" />
          </div>
          <div className="mt-8 grid grid-cols-1 gap-y-10 md:grid-cols-3">
            {CATEGORIES.map((cat) => (
              <div key={cat.title}>
                <Image
                  src={cat.image}
                  alt={cat.alt}
                  width={1400}
                  height={790}
                  sizes="(min-width: 768px) 34vw, 100vw"
                  className="h-auto w-full"
                />
                <div className="px-4 pt-6 md:px-8">
                  <h3 className="text-sm font-extrabold uppercase">{cat.title}</h3>
                  <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm">
                    {cat.items.map((item) => (
                      <li key={item.name}>
                        {item.name}{" "}
                        <span className={cn("font-medium italic", PRICE_TEXT[cat.color])}>
                          {item.from && "Desde "}
                          {money(item.price)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Cómo pedir */}
        <section className={cn(CONTAINER, "py-14 md:py-20")}>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <SectionTitle title="¿Cómo pedir?" subtitle="Para todos los gustos y medidas" />
            <WhatsAppButton label="Cotizar mi pedido" className="w-full md:w-auto" />
          </div>
          <Steps steps={ORDER_STEPS} />
        </section>

        {/* Impresiones */}
        <section id="impresiones" className="scroll-mt-14 py-14 md:py-20">
          <div className={CONTAINER}>
            <SectionTitle title="Tus documentos, impresos al momento" subtitle="Llegas, pides y te lo llevas" />
          </div>
          <div className="mt-8">
            <DocumentsCarousel />
          </div>
          <div className={cn(CONTAINER, "mt-14")}>
            <div className="rounded-3xl bg-black px-6 py-8 text-center text-white md:py-10">
              <h3 className="text-2xl font-extrabold tracking-tight capitalize md:text-4xl">
                ¿Necesitas otro documento?
              </h3>
              <p className="mt-2 text-sm text-white/85">
                Escríbenos por{" "}
                <a
                  href={STORE_INFO.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline underline-offset-4"
                >
                  WhatsApp
                </a>{" "}
                y te decimos si lo podemos imprimir.
              </p>
            </div>
          </div>
        </section>

        {/* Colectivo */}
        <section id="colectivo" className="scroll-mt-14 py-14 md:py-20">
          <div className={CONTAINER}>
            <SectionTitle title="Marcas locales, en el mismo local" subtitle="Algo de lo que hay hoy en la tienda" />
          </div>
          {/* Chips y fila a todo lo ancho de la pantalla. */}
          <div className="mt-6">
            <ColectivoProducts />
          </div>
        </section>

        {/* Visítanos */}
        <section id="visitanos" className={cn(CONTAINER, "scroll-mt-14 py-14 md:py-20")}>
          <SectionTitle title="Pasa a saludar" subtitle="San Quintín, B.C." />
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="relative h-72 overflow-hidden rounded-2xl border border-black/10 bg-black/5 md:h-auto md:min-h-96">
              <iframe
                title="Mapa de Cuatas Tienda"
                src={`https://www.google.com/maps?q=${MAP_QUERY}&output=embed`}
                className="absolute inset-0 h-full w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${MAP_QUERY}`}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-3 left-3 right-3 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-medium shadow-md sm:right-auto"
              >
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="truncate">{ADDRESS}</span>
                <ArrowUpRight className="h-4 w-4 shrink-0" />
              </a>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-black/10 p-5">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Clock className="h-4 w-4" />
                  Horario
                </p>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt>{STORE_HOURS_LABEL.weekdays}</dt>
                    <dd className="text-black/70">{STORE_HOURS_LABEL.weekdaysHours}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>{STORE_HOURS_LABEL.sunday}</dt>
                    <dd className="text-black/70">{STORE_HOURS_LABEL.sundayHours}</dd>
                  </div>
                </dl>
              </div>
              <ul className="space-y-1 rounded-2xl border border-black/10 p-3 text-sm">
                {[
                  { icon: MessageCircle, label: `WhatsApp · ${STORE_INFO.phone}`, href: STORE_INFO.whatsappUrl },
                  { icon: Phone, label: `Llámanos · ${STORE_INFO.phone}`, href: `tel:+52${STORE_INFO.phone.replace(/\s/g, "")}` },
                  { icon: Mail, label: STORE_INFO.email, href: `mailto:${STORE_INFO.email}` },
                  { icon: AtSign, label: STORE_INFO.social, href: null },
                ].map(({ icon: Icon, label, href }) => {
                  const body = (
                    <>
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{label}</span>
                    </>
                  );
                  return (
                    <li key={label}>
                      {href ? (
                        <a
                          href={href}
                          target={href.startsWith("http") ? "_blank" : undefined}
                          rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                          className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-black/5"
                        >
                          {body}
                        </a>
                      ) : (
                        <span className="flex items-center gap-3 px-2 py-2">{body}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-black text-white">
        <div className={cn(CONTAINER, "py-10")}>
          <div className="flex flex-col gap-3 text-xs text-white/80 md:flex-row md:items-center md:justify-between">
            <ul className="flex flex-wrap items-center gap-4">
              {[
                { label: "Personalizados", color: "yellow" },
                { label: "Impresiones", color: "blue" },
                { label: "Colectivo", color: "red" },
              ].map((l) => (
                <li key={l.label} className="flex items-center gap-2">
                  <span className={cn("h-1.5 w-1.5 rounded-full", DOT[l.color])} />
                  {l.label}
                </li>
              ))}
            </ul>
            <p>
              {STORE_HOURS_LABEL.weekdays} {STORE_HOURS_LABEL.weekdaysHours} · {STORE_HOURS_LABEL.sunday}{" "}
              {STORE_HOURS_LABEL.sundayHours}
            </p>
          </div>

          <a
            href={STORE_INFO.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-10 flex items-end gap-3 md:mt-16"
          >
            <span className="text-6xl leading-none font-extrabold tracking-tighter sm:text-7xl md:text-[9rem]">
              Cotiza tu idea
            </span>
            <ArrowUpRight className="mb-2 h-8 w-8 shrink-0 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1 md:mb-6 md:h-14 md:w-14" />
          </a>

          <div className="mt-10 flex flex-col gap-2 border-t border-white/15 pt-6 text-xs text-white/70 sm:flex-row sm:items-center sm:justify-between">
            <span>Cuatas © {new Date().getFullYear()}</span>
            <span>San Quintín, Baja California</span>
            <a href="#inicio" className="hover:text-white">
              Volver arriba
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
