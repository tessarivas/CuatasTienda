import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";
import { uploadReceiptImage, readReceiptFile } from "@/lib/cloudinary/receipt";

type Ctx = { params: Promise<{ id: string }> };

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// POST /api/payments/[id]/receipt — multipart con `file` (imagen).
// Adjunta (o reemplaza) el comprobante de un abono con tarjeta o
// transferencia (incluido el que genera "Liquidar Cuenta"). Se hace desde el
// Corte de Caja, también después de cerrado.
export async function POST(req: Request, { params }: Ctx) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const payment = await prisma.payment.findUnique({
    where: { id },
    select: { id: true, method: true },
  });
  if (!payment) {
    return NextResponse.json({ error: "Abono no encontrado" }, { status: 404 });
  }
  if (payment.method === "Efectivo") {
    return NextResponse.json(
      { error: "Sólo los abonos con tarjeta o transferencia llevan comprobante" },
      { status: 409 }
    );
  }

  const read = await readReceiptFile(req);
  if ("error" in read) {
    return NextResponse.json({ error: read.error }, { status: 400 });
  }

  try {
    const upload = await uploadReceiptImage(read.buffer, "abonos", String(id));
    const updated = await prisma.payment.update({
      where: { id },
      data: { receiptUrl: upload.secure_url },
      select: { id: true, receiptUrl: true },
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("POST comprobante de abono falló", err);
    return NextResponse.json(
      { error: "No se pudo subir el comprobante" },
      { status: 500 }
    );
  }
}
