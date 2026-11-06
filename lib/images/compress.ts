import imageCompression from "browser-image-compression";
import { IMAGE_MAX_SIDE, IMAGE_TARGET_MB, type ImageKind } from "./sizes";

// ¿El navegador sabe *codificar* WebP en un canvas? Safari (iPhone y Mac) no:
// le pides WebP y te regresa un PNG sin avisar. Eso arruinaba las fotos del
// iPhone: browser-image-compression baja la calidad para llegar al peso
// objetivo, pero un PNG no tiene calidad, así que lo único que le quedaba era
// encoger la foto una y otra vez (o rendirse con un PNG enorme). Se revisa una
// vez: un canvas de 1×1 pedido como WebP dice "data:image/webp" sólo si se pudo.
let webpEncodeSupport: boolean | null = null;
function canEncodeWebp(): boolean {
  if (webpEncodeSupport === null) {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      webpEncodeSupport = canvas.toDataURL("image/webp").startsWith("data:image/webp");
    } catch {
      webpEncodeSupport = false;
    }
  }
  return webpEncodeSupport;
}

// Achica una imagen en el navegador antes de subirla: lado mayor según el
// tipo y WebP (JPEG donde no se puede WebP, p. ej. Safari). Sube más rápido
// con el internet de la tienda y gasta menos del plan de Cloudinary; el
// servidor la guarda en WebP de todos modos. Sólo para componentes de cliente.
//
// Si algo falla (p. ej. un HEIC de iPhone que Chrome no sabe leer) se sube el
// original: el servidor lo acepta hasta MAX_UPLOAD_BYTES y Cloudinary lo
// achica al guardarlo de todos modos.
export async function compressImage(file: File, kind: ImageKind): Promise<File> {
  // Un SVG ya es ligero y rasterizarlo lo empeoraría.
  if (file.type === "image/svg+xml") return file;
  const [type, ext] = canEncodeWebp() ? ["image/webp", "webp"] : ["image/jpeg", "jpg"];
  try {
    const compressed = await imageCompression(file, {
      maxWidthOrHeight: IMAGE_MAX_SIDE[kind],
      maxSizeMB: IMAGE_TARGET_MB[kind],
      fileType: type,
      // Arranca en buena calidad: el servidor y la entrega de Cloudinary
      // vuelven a comprimir, así que aquí no conviene apretar de más.
      initialQuality: 0.9,
      useWebWorker: true,
    });
    if (compressed.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + "." + ext;
    return new File([compressed], name, { type: compressed.type || type });
  } catch (err) {
    console.warn("No se pudo comprimir la imagen, se sube la original", err);
    return file;
  }
}
