import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";
import { uploadSupplierImage } from "@/lib/cloudinary/supplier";

export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(suppliers);
  } catch (err) {
    console.error("GET suppliers failed", err);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const name = formData.get("name") as string;
    const businessName = formData.get("businessName") as string;
    const cellphone = formData.get("cellphone") as string | null;
    const email = formData.get("email") as string | null;
    const image = formData.get("image") as File | null;

    if (!name || !businessName) {
      return NextResponse.json(
        { error: "Name and businessName required" },
        { status: 400 }
      );
    }

    // Create supplier FIRST (no logo)
    const supplier = await prisma.supplier.create({
      data: {
        name,
        businessName,
        cellphone,
        email,
        logo: null,
      },
    });

    // Upload image using supplier.id and name for folder structure
    if (image) {
      const buffer = Buffer.from(await image.arrayBuffer());
      const upload = await uploadSupplierImage(buffer, supplier.id, supplier.name);

      // 3️⃣ Update supplier with logo URL
      const updated = await prisma.supplier.update({
        where: { id: supplier.id },
        data: { logo: upload.secure_url },
      });

      return NextResponse.json(updated);
    }

    return NextResponse.json(supplier);
  } catch (err) {
    console.error("POST supplier failed", err);
    return NextResponse.json(
      { error: "Failed to create supplier" },
      { status: 500 }
    );
  }
}