import cloudinary from "./cloudinary";

// Comprobante de pago (foto del voucher o captura de la transferencia).
// public_id determinista por cobro, para que volver a subirlo reemplace el
// anterior en vez de acumular copias:
//   comprobantes/ventas/{folio}   comprobantes/abonos/{paymentId}
//   comprobantes/pedidos/{serviceOrderPaymentId}
export async function uploadReceiptImage(
  file: Buffer,
  kind: "ventas" | "abonos" | "pedidos",
  key: string
) {
  return new Promise<{ secure_url: string }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: `comprobantes/${kind}`,
          public_id: key,
          overwrite: true,
          // Sólo imágenes: Cloudinary rechaza lo que no lo sea.
          resource_type: "image",
        },
        (error, result) => {
          if (error || !result) return reject(error);
          resolve({ secure_url: result.secure_url });
        }
      )
      .end(file);
  });
}

// Máximo para una foto de celular o captura de pantalla.
export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

// Lee y valida el campo `file` de un multipart. Devuelve el buffer o un
// mensaje de error en español.
export async function readReceiptFile(
  req: Request
): Promise<{ buffer: Buffer } | { error: string }> {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return { error: "Se esperaba un archivo" };
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Falta la imagen del comprobante" };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "El comprobante debe ser una imagen" };
  }
  if (file.size > MAX_RECEIPT_BYTES) {
    return { error: "La imagen pesa más de 10 MB" };
  }
  return { buffer: Buffer.from(await file.arrayBuffer()) };
}
