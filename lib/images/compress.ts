import imageCompression from "browser-image-compression";
import { IMAGE_MAX_SIDE, IMAGE_TARGET_MB, type ImageKind } from "./sizes";

// Achica una imagen en el navegador antes de subirla: lado mayor según el
// tipo y WebP. Sube más rápido con el internet de la tienda y gasta menos del
// plan de Cloudinary. Sólo para componentes de cliente.
//
// Si algo falla (p. ej. un HEIC de iPhone que Chrome no sabe leer) se sube el
// original: el servidor lo acepta hasta MAX_UPLOAD_BYTES y Cloudinary lo
// achica al guardarlo de todos modos.
export async function compressImage(file: File, kind: ImageKind): Promise<File> {
  // Un SVG ya es ligero y rasterizarlo lo empeoraría.
  if (file.type === "image/svg+xml") return file;
  try {
    const compressed = await imageCompression(file, {
      maxWidthOrHeight: IMAGE_MAX_SIDE[kind],
      maxSizeMB: IMAGE_TARGET_MB[kind],
      fileType: "image/webp",
      useWebWorker: true,
    });
    if (compressed.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return new File([compressed], name, { type: "image/webp" });
  } catch (err) {
    console.warn("No se pudo comprimir la imagen, se sube la original", err);
    return file;
  }
}
