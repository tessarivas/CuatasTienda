"use client";

import * as React from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { Menu, MessageCircle, X } from "lucide-react";
import { STORE_INFO } from "@/lib/store-info";

export const NAV_LINKS = [
  { href: "#impresiones", label: "Impresiones" },
  { href: "#personalizados", label: "Personalizados" },
  { href: "#colectivo", label: "Colectivo" },
  { href: "#visitanos", label: "Visítanos" },
];

// Barra de arriba, fija. En celular los enlaces van en un menú que se abre
// con el botón de las tres rayas.
export function LandingNav() {
  const [open, setOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 md:px-8">
        <a href="#inicio" aria-label="Cuatas Tienda, ir al inicio" className="shrink-0">
          <Image src="/LOGO_CUATAS.svg" alt="Cuatas Tienda" width={28} height={28} priority />
        </a>

        <ul className="mx-auto hidden items-center gap-7 text-sm font-medium md:flex">
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="transition-opacity hover:opacity-60">
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <a
          href={STORE_INFO.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex h-9 items-center gap-2 rounded-full bg-black px-4 text-sm font-medium text-white transition-opacity hover:opacity-85 md:ml-0"
        >
          <MessageCircle className="h-4 w-4" />
          Escríbenos
        </a>
        <button
          type="button"
          className="-mr-2 flex h-9 w-9 cursor-pointer items-center justify-center md:hidden"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-black/5 px-4 md:hidden"
          >
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block py-3 text-base font-medium"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </header>
  );
}
