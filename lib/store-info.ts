// Datos de la tienda que aparecen en los reportes PDF (encabezado).
export const STORE_INFO = {
  name: "Cuatas Tienda",
  addressLine1: "Carretera Transpeninsular #1067",
  addressLine2: "San Quintín, B.C., México 22940",
  phone: "616 159 9954",
  email: "cuatas.tienda@gmail.com",
  // PNG generado una vez desde public/LOGO_CUATAS.svg (react-pdf no dibuja
  // bien un SVG desde archivo).
  logoPath: "/LOGO_CUATAS.png",
} as const;
