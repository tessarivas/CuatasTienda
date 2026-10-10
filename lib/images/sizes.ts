// Tamaños de las imágenes que guardamos, compartidos por el navegador (que
// comprime antes de subir, `lib/images/compress.ts`) y el servidor (que le
// pide a Cloudinary el mismo tope al guardar, `lib/cloudinary/upload.ts`).
// Estamos en el plan gratis de Cloudinary: una foto de celular sin tocar pesa
// 3–8 MB, achicada a esto queda en unos cientos de KB.

export type ImageKind = "product" | "logo" | "receipt";

// Lado mayor, en px. El comprobante va más grande para que se lean el voucher
// o los datos de la transferencia.
export const IMAGE_MAX_SIDE: Record<ImageKind, number> = {
  product: 1200,
  logo: 800,
  receipt: 2000,
};

// Peso objetivo al comprimir en el navegador, en MB.
export const IMAGE_TARGET_MB: Record<ImageKind, number> = {
  product: 0.5,
  logo: 0.3,
  receipt: 1,
};

// Tope de lo que acepta el servidor. Lo normal es que llegue ya comprimido;
// esto sólo frena un original que se colara (p. ej. si la compresión falló).
// Queda bajo los ~4.5 MB por request que aceptan los hostings serverless.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_UPLOAD_LABEL = "4 MB";
