"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

// Página 404 de toda la app. Se muestra dentro del layout raíz, no del
// panel (sin sidebar), así que lleva su propio logo y un camino de regreso.
export default function NotFound() {
  const router = useRouter();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12 text-center">
      <Link href="/admin/dashboard" className="mb-10 flex items-center gap-2">
        <Image src="/LOGO_CUATAS.svg" alt="Cuatas Tienda" width={28} height={36} />
        <span className="text-lg font-semibold">Cuatas Tienda</span>
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center"
      >
        <p className="mb-4 text-8xl font-bold tracking-tight text-muted-foreground/30 select-none md:text-9xl">
          404
        </p>

        <h1 className="text-2xl font-bold">No encontramos esta página</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Puede que el enlace esté mal escrito o que la página ya no exista.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <Button variant="outline" className="cursor-pointer" onClick={() => router.back()}>
            <ArrowLeft />
            Regresar
          </Button>
          <Button className="cursor-pointer" asChild>
            <Link href="/admin/dashboard">
              <Home />
              Ir al inicio
            </Link>
          </Button>
        </div>
      </motion.div>
    </main>
  );
}
