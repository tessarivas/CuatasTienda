import { prisma } from "@/lib/db/client";
import { uploadSupplierImage } from "@/lib/cloudinary/supplier";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supplierId = Number(params.id);
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
  });

  if (!supplier) {
    return NextResponse.json(
      { error: "Supplier not found" },
      { status: 404 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // 🔁 overwrite same public_id
  const upload = await uploadSupplierImage(
    buffer,
    supplierId
  );

  const updated = await prisma.supplier.update({
    where: { id: supplierId },
    data: { logo: upload.secure_url },
  });

  return NextResponse.json(updated);
}
