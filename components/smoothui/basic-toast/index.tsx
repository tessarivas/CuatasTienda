"use client";

// Basado en SmoothUI "Basic Toast" (npx shadcn@latest add @smoothui/basic-toast).
// Cambios para esta app:
// - Colores con los tokens de la marca (my-*) en vez de red/emerald/amber/blue.
// - En vez de un toast suelto fijo en la esquina, un <Toaster /> que apila
//   varios (lib/toast.ts) para que no se encimen; se monta una vez en el
//   layout raíz y se usa con `toast.success(...)` desde cualquier archivo.
// - Encima de los modales (z-[100]; los Dialog usan z-50).
// Se conservan la animación de entrada/salida y prefers-reduced-motion.

import * as React from "react";
import { AlertCircle, CheckCircle, Info, X, XCircle } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import {
  type ToastItem,
  type ToastType,
  dismissToast,
  getServerToasts,
  getToasts,
  subscribeToasts,
} from "@/lib/toast";

// Sin color propio: toman el del texto (-dark) del toast, que resalta más
// que el tono base sobre el fondo -light.
const toastIcons: Record<ToastType, React.ReactNode> = {
  error: <XCircle className="h-5 w-5" />,
  info: <Info className="h-5 w-5" />,
  success: <CheckCircle className="h-5 w-5" />,
  warning: <AlertCircle className="h-5 w-5" />,
};

// Mismo par que las etiquetas de estado: fondo -light y texto -dark.
const toastClasses: Record<ToastType, string> = {
  error: "border-my-red/30 bg-my-red-light text-my-red-dark",
  info: "border-my-blue/30 bg-my-blue-light text-my-blue-dark",
  success: "border-my-green/30 bg-my-green-light text-my-green-dark",
  warning: "border-my-yellow/40 bg-my-yellow-light text-my-yellow-dark",
};

function BasicToast({ toast }: { toast: ToastItem }) {
  const shouldReduceMotion = useReducedMotion();

  React.useEffect(() => {
    if (toast.duration <= 0) return;
    const timer = setTimeout(() => dismissToast(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration]);

  return (
    <motion.div
      layout={!shouldReduceMotion}
      role={toast.type === "error" || toast.type === "warning" ? "alert" : "status"}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, x: 0 }}
      className={cn(
        "pointer-events-auto flex w-80 max-w-[calc(100vw-2rem)] items-center gap-3 rounded-lg border p-4 shadow-lg",
        toastClasses[toast.type]
      )}
      exit={
        shouldReduceMotion
          ? { opacity: 0, transition: { duration: 0 } }
          : { opacity: 0, scale: 0.8, transition: { duration: 0.15 }, x: 50 }
      }
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.8, x: 50 }}
      transition={
        shouldReduceMotion ? { duration: 0 } : { bounce: 0.1, duration: 0.25, type: "spring" as const }
      }
    >
      <div className="shrink-0">{toastIcons[toast.type]}</div>
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        aria-label="Cerrar"
        className="shrink-0 cursor-pointer rounded-full p-1 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
        onClick={() => dismissToast(toast.id)}
        type="button"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

// Pila de toasts en la esquina superior derecha. Montar una sola vez.
export function Toaster() {
  const toasts = React.useSyncExternalStore(subscribeToasts, getToasts, getServerToasts);
  return (
    <div className="pointer-events-none fixed top-4 right-4 z-[100] flex flex-col items-end gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <BasicToast key={t.id} toast={t} />
        ))}
      </AnimatePresence>
    </div>
  );
}
