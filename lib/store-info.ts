// Datos de la tienda que aparecen en los reportes PDF (encabezado) y en la
// página pública (app/page.tsx).
export const STORE_INFO = {
  name: "Cuatas Tienda",
  addressLine1: "Carretera Transpeninsular #1067",
  addressLine2: "San Quintín, B.C., México 22940",
  phone: "616 159 9954",
  email: "cuatas.tienda@gmail.com",
  // WhatsApp es el mismo teléfono; wa.me pide el número completo con lada
  // de país (52) y sin espacios.
  whatsappUrl: "https://wa.me/526161599954",
  social: "@cuatastienda",
  // PNG generado una vez desde public/LOGO_CUATAS.svg (react-pdf no dibuja
  // bien un SVG desde archivo).
  logoPath: "/LOGO_CUATAS.png",
} as const;

// Horario de la tienda (hora de la tienda, America/Tijuana). Índice = día de
// la semana como Date.getDay(): 0 domingo … 6 sábado. Horas en formato 24 h.
export const STORE_HOURS: { open: number; close: number }[] = [
  { open: 10, close: 14 }, // domingo
  { open: 8, close: 17 },
  { open: 8, close: 17 },
  { open: 8, close: 17 },
  { open: 8, close: 17 },
  { open: 8, close: 17 },
  { open: 8, close: 17 }, // sábado
];

export const STORE_HOURS_LABEL = {
  weekdays: "Lunes a sábado",
  weekdaysHours: "8:00 a.m. a 5:00 p.m.",
  sunday: "Domingo",
  sundayHours: "10:00 a.m. a 2:00 p.m.",
} as const;
