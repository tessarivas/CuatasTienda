import type { Metadata } from "next";
import Image from "next/image";
import { Poppins } from "next/font/google";
import {
  ArrowUpRight,
  Clock,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";
import { STORE_HOURS_LABEL, STORE_INFO } from "@/lib/store-info";
import { cn } from "@/lib/utils";
import { LandingNav } from "./_components/landing/landing-nav";
import { OpenStatus } from "./_components/landing/open-status";
import { Marquee } from "./_components/landing/marquee";
import { DocumentsGrid } from "./_components/landing/documents-grid";
import { ColectivoProducts } from "./_components/landing/colectivo-products";
import { FloatingHero } from "./_components/landing/floating-hero";
import { PricingTabs } from "./_components/landing/pricing-tabs";
import { OrdersGallery } from "./_components/landing/orders-gallery";
import { IdeasCarousel } from "./_components/landing/ideas-carousel";
import { AnimatedContent } from "./_components/landing/animated-content";
import {
  DOT,
  ORDER_STEPS,
  SEASON,
  STEP_NUMBER,
} from "./_components/landing/content";

// Página pública de la tienda (versión 2): vitrina, no tienda en línea. Todo
// invita a ir, llamar o escribir por WhatsApp. El panel sigue en /admin.
//
// Tipografía Poppins sólo aquí (el panel usa Inter); los colores son los
// tokens my-* de la marca. Lo de temporada (hoy Navidad) vive en SEASON, en
// content.ts.
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title:
    "Cuatas Tienda · Regalos personalizados, impresiones y colectivo en San Quintín",
  description:
    "Personalizamos sudaderas, tazas, termos y más con tu diseño. Imprimimos actas de nacimiento, CURP, NSS y más al momento. Productos de emprendedoras de San Quintín.",
};

const ADDRESS = `${STORE_INFO.addressLine1}, San Quintín 22940`;
const MAP_QUERY = encodeURIComponent(
  `${STORE_INFO.addressLine1}, ${STORE_INFO.addressLine2}`,
);
const tel = (phone: string) => `tel:+52${phone.replace(/\s/g, "")}`;

const CONTAINER = "mx-auto w-full max-w-7xl px-4 md:px-8";

// "Así quedan nuestros pedidos" queda oculta hasta tener las fotos de
// trabajos entregados y las opiniones reales de clientes.
const SHOW_ORDERS_GALLERY = false;

function SectionTitle({
  title,
  subtitle,
}: {
  title: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <AnimatedContent distance={40}>
      <h2 className="text-3xl leading-tight font-extrabold tracking-tight md:text-5xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-1 text-sm text-black/70 md:text-base">{subtitle}</p>
      )}
    </AnimatedContent>
  );
}

// Botón con contorno que abre WhatsApp, Instagram, etc.
function OutlineLink({
  href,
  icon: Icon,
  label,
  className,
}: {
  href: string;
  icon: typeof MessageCircle;
  label: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-black px-4 text-sm font-semibold transition-colors hover:bg-black hover:text-white",
        className,
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </a>
  );
}

export default function LandingPage() {
  const { hero } = SEASON;
  return (
    <div className={cn("bg-white text-black", poppins.className)}>
      <LandingNav />

      <main>
        {/* Portada de temporada: foto de fondo oscura, título y la imagen flotando. */}
        <section
          id="inicio"
          className="relative overflow-hidden bg-black text-white"
        >
          <Image
            src={hero.background}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          {/* Oscurece la izquierda para que el texto siempre se lea. */}
          <div
            aria-hidden
            className="absolute inset-0 bg-linear-to-r from-black/70 via-black/30 to-transparent"
          />
          <div
            className={cn(
              CONTAINER,
              "relative grid grid-cols-1 items-center gap-8 py-12 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] md:py-20",
            )}
          >
            <AnimatedContent trigger="mount" distance={40} stagger={0.12}>
              <OpenStatus />
              <h1 className="mt-5 text-5xl leading-[0.95] font-extrabold tracking-tight sm:text-6xl lg:text-8xl">
                {hero.title.map((line, i) => (
                  <span key={i} className="block">
                    {line}
                  </span>
                ))}
              </h1>
              <p className="mt-6 max-w-2xl text-sm text-white/90 md:text-lg">
                {hero.intro.before}
                <strong className="font-semibold text-white">
                  {hero.intro.strong}
                </strong>
                {hero.intro.after}
              </p>
            </AnimatedContent>
            <AnimatedContent
              trigger="mount"
              distance={60}
              scale={0.9}
              delay={0.3}
            >
              <FloatingHero
                src={hero.image}
                alt={hero.imageAlt}
                width={hero.imageSize.width}
                height={hero.imageSize.height}
              />
            </AnimatedContent>
          </div>
        </section>

        <Marquee />

        {/* Personalizados: ideas de temporada a todo lo ancho. */}
        <section id="personalizados" className="scroll-mt-14 pt-14 md:pt-20">
          <div className={CONTAINER}>
            <SectionTitle
              title="Tú traes la idea, nosotros la imprimimos"
              subtitle="Para todos los gustos y medidas"
            />
          </div>
          <AnimatedContent className="mt-8" distance={60} delay={0.1}>
            <IdeasCarousel />
          </AnimatedContent>
        </section>

        {/* Precios por cantidad */}
        <section className={cn(CONTAINER, "py-14 md:py-20")}>
          <SectionTitle
            title="Entre más pides, menos pagas"
            subtitle="Precios por docena para posadas, intercambios, equipos y eventos."
          />
          <AnimatedContent className="mt-8" distance={60} delay={0.1}>
            <PricingTabs />
          </AnimatedContent>
        </section>

        {/* Trabajos entregados y opiniones */}
        {SHOW_ORDERS_GALLERY && (
          <section className={cn(CONTAINER, "py-14 md:py-20")}>
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <SectionTitle
                title="Así quedan nuestros pedidos"
                subtitle="Trabajos reales que hemos entregado, y lo que dicen quienes los recibieron."
              />
              <OutlineLink
                href={STORE_INFO.instagramUrl}
                icon={Instagram}
                label={`Ver más en ${STORE_INFO.social}`}
                className="w-full md:w-auto"
              />
            </div>
            <AnimatedContent className="mt-8" distance={60} delay={0.1}>
              <OrdersGallery />
            </AnimatedContent>
          </section>
        )}

        {/* Cómo pedir */}
        <section className={cn(CONTAINER, "py-14 md:py-20")}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <SectionTitle title="¿Cómo pedir?" />
            <OutlineLink
              href={STORE_INFO.whatsappUrl}
              icon={MessageCircle}
              label="Cotizar mi pedido"
              className="w-full md:w-auto"
            />
          </div>
          <AnimatedContent
            className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6"
            distance={40}
            stagger={0.12}
          >
            {ORDER_STEPS.map((step, i) => (
              <div
                key={step.text}
                className="flex items-center gap-4 rounded-2xl bg-black px-6 py-5 text-sm font-extrabold text-white uppercase md:text-base"
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base font-medium",
                    STEP_NUMBER[step.color],
                  )}
                >
                  {i + 1}
                </span>
                {step.text}
              </div>
            ))}
          </AnimatedContent>
          <p className="mt-8 text-center text-sm md:text-base">
            {SEASON.orderNote.before}
            <strong className="font-bold">{SEASON.orderNote.strong}</strong>
          </p>
        </section>

        {/* Impresiones */}
        <section
          id="impresiones"
          className={cn(CONTAINER, "scroll-mt-14 py-14 md:py-20")}
        >
          <SectionTitle
            title="Tus documentos, impresos al momento"
            subtitle="Llegas, pides y te los llevas"
          />
          <AnimatedContent className="mt-8" distance={60} delay={0.1}>
            <DocumentsGrid />
          </AnimatedContent>
        </section>

        {/* Colectivo */}
        <section id="colectivo" className="scroll-mt-14 py-14 md:py-20">
          <div className={CONTAINER}>
            <SectionTitle
              title={
                <>
                  Emprendedoras de San Quintín,
                  <br className="hidden md:block" /> en un solo lugar.
                </>
              }
            />
          </div>
          {/* Chips y fila a todo lo ancho de la pantalla. */}
          <AnimatedContent className="mt-6" distance={60} delay={0.1}>
            <ColectivoProducts />
          </AnimatedContent>
        </section>

        {/* Visítanos */}
        <section
          id="visitanos"
          className={cn(CONTAINER, "scroll-mt-14 py-14 md:py-20")}
        >
          <SectionTitle title="Pasa a saludar" subtitle="San Quintín, B.C." />
          <AnimatedContent
            className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_22rem]"
            distance={60}
            stagger={0.12}
          >
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
                className="absolute right-3 bottom-3 left-3 inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-medium shadow-md sm:right-auto md:text-sm"
              >
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="truncate">{ADDRESS}</span>
                <ArrowUpRight className="h-4 w-4 shrink-0" />
              </a>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-black/10 px-6 py-5">
                <p className="flex items-center gap-2 text-base font-semibold">
                  <Clock className="h-5 w-5" />
                  Horario
                </p>
                <dl className="mt-3 divide-y divide-black/10 border-t border-black/10 text-sm">
                  <div className="flex justify-between gap-4 py-3">
                    <dt>{STORE_HOURS_LABEL.weekdays}</dt>
                    <dd className="text-black/60">
                      {STORE_HOURS_LABEL.weekdaysHours}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 pt-3">
                    <dt>{STORE_HOURS_LABEL.sunday}</dt>
                    <dd className="text-black/60">
                      {STORE_HOURS_LABEL.sundayHours}
                    </dd>
                  </div>
                </dl>
              </div>
              <ul className="divide-y divide-black/10 rounded-2xl border border-black/10 px-6 py-2 text-sm">
                {[
                  {
                    icon: MessageCircle,
                    label: `WhatsApp · ${STORE_INFO.phone}`,
                    href: STORE_INFO.whatsappUrl,
                  },
                  {
                    icon: Phone,
                    label: `Llámanos · ${STORE_INFO.callPhone}`,
                    href: tel(STORE_INFO.callPhone),
                  },
                  {
                    icon: Mail,
                    label: STORE_INFO.email,
                    href: `mailto:${STORE_INFO.email}`,
                  },
                  {
                    icon: Instagram,
                    label: STORE_INFO.social,
                    href: STORE_INFO.instagramUrl,
                  },
                ].map(({ icon: Icon, label, href }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target={href.startsWith("http") ? "_blank" : undefined}
                      rel={
                        href.startsWith("http")
                          ? "noopener noreferrer"
                          : undefined
                      }
                      className="flex items-center gap-3 py-3 transition-opacity hover:opacity-70"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/5">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="truncate">{label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </AnimatedContent>
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
                  <span
                    className={cn("h-1.5 w-1.5 rounded-full", DOT[l.color])}
                  />
                  {l.label}
                </li>
              ))}
            </ul>
            <p>
              {STORE_HOURS_LABEL.weekdays} {STORE_HOURS_LABEL.weekdaysHours} ·{" "}
              {STORE_HOURS_LABEL.sunday} {STORE_HOURS_LABEL.sundayHours}
            </p>
          </div>

          <a
            href={STORE_INFO.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-10 flex items-end gap-3 md:mt-16"
          >
            <span className="text-6xl leading-none font-extrabold tracking-tighter sm:text-7xl md:text-[9rem]">
              {SEASON.footerCta}
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
