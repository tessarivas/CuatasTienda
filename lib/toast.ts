// Notificaciones (toasts) de toda la app, en lugar de `alert()`.
//
//   toast.success("Abono registrado");
//   toast.error(message ?? "No se pudo guardar");
//
// Es un store mínimo fuera de React: cualquier archivo puede llamar a
// `toast.*` sin hooks ni providers, y el <Toaster /> del layout raíz
// (components/smoothui/basic-toast) se suscribe y los dibuja.

export type ToastType = "success" | "error" | "warning" | "info";

export type ToastItem = {
  id: number;
  type: ToastType;
  message: string;
  // ms antes de cerrarse solo; 0 = sólo se cierra con la ✕.
  duration: number;
};

// Los errores y avisos se quedan un poco más: suelen traer algo que leer.
const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 3000,
  info: 4000,
  warning: 6000,
  error: 6000,
};

// Más de esto en pantalla ya no se lee; se van los más viejos.
const MAX_VISIBLE = 4;

let toasts: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function show(type: ToastType, message: string, options?: { duration?: number }) {
  const id = nextId++;
  toasts = [
    ...toasts,
    { id, type, message, duration: options?.duration ?? DEFAULT_DURATION[type] },
  ].slice(-MAX_VISIBLE);
  emit();
  return id;
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function subscribeToasts(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getToasts = () => toasts;
const EMPTY: ToastItem[] = [];
// En el servidor nunca hay toasts.
export const getServerToasts = () => EMPTY;

export const toast = {
  success: (message: string, options?: { duration?: number }) => show("success", message, options),
  error: (message: string, options?: { duration?: number }) => show("error", message, options),
  warning: (message: string, options?: { duration?: number }) => show("warning", message, options),
  info: (message: string, options?: { duration?: number }) => show("info", message, options),
};
