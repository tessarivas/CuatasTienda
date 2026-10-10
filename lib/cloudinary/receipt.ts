import { imageFileError, uploadImage } from "./upload";

// Comprobante de pago (foto del voucher o captura de la transferencia).
// public_id determinista por cobro, para que volver a subirlo reemplace el
// anterior en vez de acumular copias:
//   comprobantes/ventas/{folio}   comprobantes/abonos/{paymentId}
//   comprobantes/pedidos/{serviceOrderPaymentId}
export function uploadReceiptImage(
  file: Buffer,
  kind: "ventas" | "abonos" | "pedidos",
  key: string
) {
  return uploadImage(file, "receipt", {
    publicId: `comprobantes/${kind}/${key}`,
    assetFolder: `comprobantes/${kind}`,
    displayName: key,
  });
}

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
  const error = imageFileError(file);
  if (error) return { error };
  return { buffer: Buffer.from(await file.arrayBuffer()) };
}
