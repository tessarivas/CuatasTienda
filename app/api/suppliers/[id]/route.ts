import { prisma } from "@/lib/db/client";
import { uploadSupplierImage } from "@/lib/cloudinary/supplier";
import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";

type Ctx = { params: Promise<{ id: string }> };

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(_req: Request, { params }: Ctx) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      Product: {
        orderBy: { title: "asc" },
      },
    },
  });

  if (!supplier) {
    return NextResponse.json(
      { error: "Proveedor no encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json(supplier);
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const input = body as {
    name?: unknown;
    businessName?: unknown;
    cellphone?: unknown;
    email?: unknown;
    cutoffDay?: unknown;
  };

  const data: Prisma.SupplierUpdateInput = {};

  if (input.name !== undefined) {
    if (typeof input.name !== "string" || input.name.trim().length === 0) {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
        { status: 400 }
      );
    }
    data.name = input.name.trim();
  }

  if (input.businessName !== undefined) {
    if (input.businessName === null || input.businessName === "") {
      data.businessName = null;
    } else if (typeof input.businessName === "string") {
      data.businessName = input.businessName.trim();
    } else {
      return NextResponse.json(
        { error: "businessName inválido" },
        { status: 400 }
      );
    }
  }

  if (input.cellphone !== undefined) {
    if (input.cellphone === null || input.cellphone === "") {
      data.cellphone = null;
    } else if (typeof input.cellphone === "string") {
      data.cellphone = input.cellphone.trim();
    } else {
      return NextResponse.json(
        { error: "cellphone inválido" },
        { status: 400 }
      );
    }
  }

  if (input.email !== undefined) {
    if (input.email === null || input.email === "") {
      data.email = null;
    } else if (typeof input.email === "string") {
      data.email = input.email.trim();
    } else {
      return NextResponse.json({ error: "email inválido" }, { status: 400 });
    }
  }

  if (input.cutoffDay !== undefined) {
    if (input.cutoffDay === null) {
      data.cutoffDay = null;
    } else {
      const day = Number(input.cutoffDay);
      if (!Number.isInteger(day) || day < 1 || day > 31) {
        return NextResponse.json(
          { error: "cutoffDay debe ser un día válido entre 1 y 31" },
          { status: 400 }
        );
      }
      data.cutoffDay = day;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "No hay cambios para aplicar" },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.supplier.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Proveedor no encontrado" },
        { status: 404 }
      );
    }
    console.error("PATCH supplier failed", err);
    return NextResponse.json(
      { error: "No se pudo actualizar el proveedor" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const productCount = await prisma.product.count({ where: { supplierId: id } });
  if (productCount > 0) {
    return NextResponse.json(
      {
        error:
          "No se puede eliminar el proveedor porque tiene productos asociados",
        productCount,
      },
      { status: 409 }
    );
  }

  try {
    await prisma.supplier.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Proveedor no encontrado" },
        { status: 404 }
      );
    }
    console.error("DELETE supplier failed", err);
    return NextResponse.json(
      { error: "No se pudo eliminar el proveedor" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request, { params }: Ctx) {
  const { id: rawId } = await params;
  const supplierId = parseId(rawId);
  if (supplierId === null) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

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
  const upload = await uploadSupplierImage(buffer, supplierId, supplier.name);

  const updated = await prisma.supplier.update({
    where: { id: supplierId },
    data: { logo: upload.secure_url },
  });

  return NextResponse.json(updated);
}
