import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";
import { uploadProductImage } from "@/lib/cloudinary/product";

// GET: traer productos para el POS
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: {
        status: "Disponible",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(products);
  } catch (err) {
    console.error("GET products failed", err);
    return NextResponse.json([], { status: 500 });
  }
}

// POST: crear producto
export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const title = formData.get("title") as string;
    const price = Number(formData.get("price"));
    const quantity = Number(formData.get("quantity"));
    const supplierId = Number(formData.get("supplierId"));
    const status = (formData.get("status") as string) ?? "Disponible";
    const code = formData.get("code") as string | null;
    const type = (formData.get("type") as "PRODUCT" | "SERVICE") ?? "PRODUCT";
    const image = formData.get("image") as File | null;

    if (!title || !price || !quantity || !supplierId) {
      return NextResponse.json(
        { error: "Title, price, quantity and supplierId are required" },
        { status: 400 }
      );
    }

    // 1. Create product first (no picture)
    const product = await prisma.product.create({
      data: {
        title,
        price,
        quantity,
        status,
        code,
        picture: null,
        type,
        Supplier: {
          connect: { id: supplierId },
        },
      },
    });

    // 2. Upload image using product.id
    if (image) {
      const buffer = Buffer.from(await image.arrayBuffer());
      const upload = await uploadProductImage(buffer, product.id, product.title);

      // 3. Update product with picture URL
      const updated = await prisma.product.update({
        where: { id: product.id },
        data: { picture: upload.secure_url },
      });

      return NextResponse.json(updated, { status: 201 });
    }

    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    console.error("POST product failed", err);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
