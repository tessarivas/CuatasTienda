import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json();

  const product = await prisma.product.update({
    where: { id: Number(params.id) },
    data: {
      quantity: body.quantity,
      status: body.status,
    },
  });

  return NextResponse.json(product);
}