import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";

export async function GET() {
  const suppliers = await prisma.supplier.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(suppliers);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validación mínima
    if (!body.name || !body.businessName) {
      return NextResponse.json(
        { error: "name y businessName son obligatorios" },
        { status: 400 }
      );
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: body.name,                // ✅ FIX
        businessName: body.businessName,
        cellphone: body.cellphone || null,
        email: body.email || null,
      },
    });

    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    console.error("Error creating supplier:", error);
    return NextResponse.json(
      { error: "Error creando proveedor" },
      { status: 500 }
    );
  }
}