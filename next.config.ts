import type { NextConfig } from "next";

// Encabezados de seguridad en todas las respuestas:
// - Ningún otro sitio puede meter el panel en un <iframe> (clickjacking: un
//   botón "Eliminar" escondido bajo otra página). La impresión de tickets usa
//   un iframe vacío creado por script, al que esto no le aplica.
// - El navegador no "adivina" tipos de archivo, no manda la URL completa a
//   otros sitios, y sólo habla con el panel por HTTPS (el hosting lo sirve así).
// - Sin cámara, micrófono ni ubicación: el panel no los usa.
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client"],
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  images: {
    // Las fotos las achica Cloudinary, no Next (ver el archivo).
    loader: "custom",
    loaderFile: "./lib/images/cloudinary-loader.ts",
    remotePatterns: [ {
      protocol: "https",
      hostname: "res.cloudinary.com",
      port: "",
      pathname: "/**",
    } ],
  },
};

export default nextConfig;
