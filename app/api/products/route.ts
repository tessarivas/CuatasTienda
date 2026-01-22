import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";

// GET: traer productos para el POS
export async function GET() {
  const products = await prisma.product.findMany({
    where: {
      status: "Disponible",
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(products);
}

// POST: crear producto
export async function POST(req: Request) {
  const body = await req.json();

  const product = await prisma.product.create({
    data: {
      title: body.title,
      price: body.price,
      quantity: body.quantity,
      status: body.status ?? "Disponible",
      code: body.code,
      picture: body.picture, // URL de Cloudinary (luego)
      supplierId: body.supplierId,
      type: body.type,
    },
  });

  return NextResponse.json(product, { status: 201 });
}
