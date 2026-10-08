import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";
import { uploadReceiptImage, readReceiptFile } from "@/lib/cloudinary/receipt";

type Ctx = { params: Promise<{ id: string }> };

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// POST /api/service-order-payments/[id]/receipt — multipart con `file`.
// Comprobante de un anticipo o pago de pedido de servicio con tarjeta o
// transferencia. Igual que los abonos: se adjunta desde el Corte de Caja.
export async function POST(req: Request, { params }: Ctx) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const payment = await prisma.serviceOrderPayment.findUnique({
    where: { id },
    select: { method: true, kind: true },
  });
  if (!payment) {
    return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
  }
  if (payment.kind === "Devolucion" || payment.method === "Efectivo") {
    return NextResponse.json(
      { error: "Sólo los pagos con tarjeta o transferencia llevan comprobante" },
      { status: 409 }
    );
  }

  const read = await readReceiptFile(req);
  if ("error" in read) {
    return NextResponse.json({ error: read.error }, { status: 400 });
  }

  try {
    const upload = await uploadReceiptImage(read.buffer, "pedidos", String(id));
    const updated = await prisma.serviceOrderPayment.update({
      where: { id },
      data: { receiptUrl: upload.secure_url },
      select: { id: true, receiptUrl: true },
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("POST comprobante de pedido falló", err);
    return NextResponse.json({ error: "No se pudo subir el comprobante" }, { status: 500 });
  }
}
