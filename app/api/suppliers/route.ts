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

    if (!name) {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }

    let logo: string | null = null;

    if (image) {
      const buffer = Buffer.from(await image.arrayBuffer());
      const upload = await uploadSupplierImage(buffer, name);
      logo = upload.secure_url;
    }

    const supplier = await prisma.supplier.create({
      data: {
        name,
        businessName,
        cellphone,
        email,
        logo,
      },
    });

    return NextResponse.json(supplier);
  } catch (err) {
    console.error("POST supplier failed", err);
    return NextResponse.json(
      { error: "Failed to create supplier" },
      { status: 500 }
    );
  }
}