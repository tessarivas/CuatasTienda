import type { ImageLoaderProps } from "next/image";

// Pide a Cloudinary la imagen al ancho en que se va a mostrar: formato y
// calidad automáticos (WebP/AVIF según el navegador), sin agrandar nunca
// (`c_limit`). Cloudinary genera cada tamaño una sola vez y lo guarda en caché;
// cada variante nueva cuesta una transformación (1,000 = 1 crédito del plan).
// Las URLs que no son de Cloudinary se devuelven tal cual.
export function cloudinaryUrl(src: string, width: number): string {
  if (!src.includes("res.cloudinary.com") || !src.includes("/image/upload/")) {
    return src;
  }
  return src.replace(
    "/image/upload/",
    `/image/upload/f_auto,q_auto,c_limit,w_${width}/`
  );
}

// Loader global de next/image (`images.loaderFile` en next.config.ts): las
// fotos se achican en Cloudinary y no en el servidor de Next, así que no
// dependemos de la optimización de imágenes (y sus límites) del hosting.
// Los archivos locales (/LOGO_CUATAS.svg) se sirven tal cual; el `?w=` sólo
// está para que Next no avise que el loader ignora el ancho.
export default function cloudinaryLoader({ src, width }: ImageLoaderProps) {
  if (src.startsWith("/")) return `${src}?w=${width}`;
  return cloudinaryUrl(src, width);
}
