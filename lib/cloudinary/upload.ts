import cloudinary from "./cloudinary";
import {
  IMAGE_MAX_SIDE,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_LABEL,
  type ImageKind,
} from "@/lib/images/sizes";

// Valida un archivo de imagen recibido en un multipart. Devuelve el mensaje
// de error en español, o null si se puede subir.
export function imageFileError(file: File): string | null {
  if (!file.type.startsWith("image/")) return "El archivo debe ser una imagen";
  if (file.size > MAX_UPLOAD_BYTES) {
    return `La imagen pesa más de ${MAX_UPLOAD_LABEL}`;
  }
  return null;
}

// La cuenta de Cloudinary está en modo de "dynamic folders": el public_id (lo
// que va en la URL) es independiente de la carpeta y el nombre que se ven en la
// Media Library. Así el public_id se arma con algo que nunca cambia (código,
// id) y la carpeta/nombre visibles se pueden actualizar al renombrar sin
// romper ninguna URL guardada en la base.
export type ImagePlacement = {
  publicId: string; // estable; p. ej. products/CU-PAV6ANCG
  assetFolder: string; // carpeta visible; p. ej. products/Full Moons
  displayName: string; // nombre visible; p. ej. Camiseta negra
};

// Limpia un texto para usarlo como carpeta o nombre visible en Cloudinary,
// que no acepta / \ ? & # % < > en ellos. Conserva espacios y acentos.
export function cloudinaryLabel(text: string): string {
  const clean = text
    .replace(/[/\\?&#%<>:"|*+]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return clean || "Sin nombre";
}

// Sube una imagen sobreescribiendo siempre el mismo public_id (volver a
// subirla la reemplaza en vez de acumular copias).
//
// La transformación "incoming" hace que Cloudinary guarde sólo la versión
// achicada (lado mayor según el tipo, calidad automática, WebP), nunca el
// original: es la red de seguridad por si el navegador no comprimió. Cuesta
// una transformación por subida (1,000 = 1 crédito del plan).
export function uploadImage(
  file: Buffer,
  kind: ImageKind,
  { publicId, assetFolder, displayName }: ImagePlacement
) {
  const side = IMAGE_MAX_SIDE[kind];
  return new Promise<{ secure_url: string }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          public_id: publicId,
          asset_folder: assetFolder,
          display_name: displayName,
          overwrite: true,
          resource_type: "image",
          format: "webp",
          transformation: [
            { width: side, height: side, crop: "limit", quality: "auto" },
          ],
        },
        (error, result) => {
          if (error || !result) return reject(error);
          resolve({ secure_url: result.secure_url });
        }
      )
      .end(file);
  });
}

// Cambia la carpeta y/o el nombre visibles de una imagen ya subida (la URL no
// cambia). Es sólo orden en la Media Library: si falla se registra y no se
// interrumpe la operación que lo pidió.
export async function relabelImage(
  publicId: string,
  changes: { assetFolder?: string; displayName?: string }
) {
  try {
    await cloudinary.api.update(publicId, {
      asset_folder: changes.assetFolder,
      display_name: changes.displayName,
    });
  } catch (err) {
    console.error("No se pudo reacomodar la imagen en Cloudinary", publicId, err);
  }
}
