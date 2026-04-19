import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { uploadProductImage } from "@/lib/cloudinary/product";

type Ctx = { params: Promise<{ id: string }> };

const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;

// Mientras el producto tenga reservas activas (LayawayItem en un Layaway
// "Activo"), estos campos quedan congelados — cambiarlos alteraría la
// promesa al cliente que ya apartó.
const RESERVED_BLOCKED_FIELDS = ["price", "quantity", "supplierId"] as const;

async function countActiveReservations(productId: number) {
  return prisma.layawayItem.count({
    where: {
      productId,
      Layaway: { status: "Activo" },
    },
  });
}

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
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
    title?: unknown;
    price?: unknown;
    quantity?: unknown;
    supplierId?: unknown;
    code?: unknown;
    status?: unknown;
  };

  if (input.code !== undefined) {
    return NextResponse.json(
      { error: "El código no se puede editar" },
      { status: 400 }
    );
  }
  if (input.status !== undefined) {
    return NextResponse.json(
      { error: "El estatus se actualiza automáticamente, no manualmente" },
      { status: 400 }
    );
  }

  const current = await prisma.product.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!current) {
    return NextResponse.json(
      { error: "Producto no encontrado" },
      { status: 404 }
    );
  }

  // (#2) Un producto retirado es efectivamente sólo-lectura. Usa
  // POST /api/products/[id]/restore para reactivarlo antes de editar.
  if (current.status === "Retirado") {
    return NextResponse.json(
      {
        error:
          "Este producto fue retirado. Restáuralo antes de editarlo.",
      },
      { status: 409 }
    );
  }

  const reservedCount = await countActiveReservations(id);
  if (reservedCount > 0) {
    const attempted = RESERVED_BLOCKED_FIELDS.find(
      (f) => (input as Record<string, unknown>)[f] !== undefined
    );
    if (attempted) {
      return NextResponse.json(
        {
          error:
            "El producto tiene unidades apartadas. Libera esos apartados antes de cambiar precio, cantidad o proveedor.",
          field: attempted,
          reservedCount,
        },
        { status: 409 }
      );
    }
  }

  const data: Prisma.ProductUpdateInput = {};

  if (input.title !== undefined) {
    if (typeof input.title !== "string" || input.title.trim().length === 0) {
      return NextResponse.json(
        { error: "El título es obligatorio" },
        { status: 400 }
      );
    }
    data.title = input.title.trim();
  }

  if (input.price !== undefined) {
    const priceStr =
      typeof input.price === "string" || typeof input.price === "number"
        ? String(input.price).trim()
        : "";
    if (!MONEY_PATTERN.test(priceStr)) {
      return NextResponse.json(
        { error: "El precio debe tener hasta dos decimales" },
        { status: 400 }
      );
    }
    if (Number(priceStr) >= 100_000_000) {
      return NextResponse.json(
        { error: "El precio excede el máximo permitido" },
        { status: 400 }
      );
    }
    data.price = Number(priceStr).toFixed(2);
  }

  if (input.quantity !== undefined) {
    const qty = Number(input.quantity);
    if (!Number.isInteger(qty) || qty < 0) {
      return NextResponse.json(
        { error: "La cantidad debe ser un entero no negativo" },
        { status: 400 }
      );
    }
    data.quantity = qty;
  }

  if (input.supplierId !== undefined) {
    const sid = Number(input.supplierId);
    if (!Number.isInteger(sid) || sid <= 0) {
      return NextResponse.json(
        { error: "Proveedor inválido" },
        { status: 400 }
      );
    }
    const exists = await prisma.supplier.findUnique({
      where: { id: sid },
      select: { id: true },
    });
    if (!exists) {
      return NextResponse.json(
        { error: "Proveedor no encontrado" },
        { status: 404 }
      );
    }
    data.Supplier = { connect: { id: sid } };
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "No hay cambios para aplicar" },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.product.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2025") {
        return NextResponse.json(
          { error: "Producto no encontrado" },
          { status: 404 }
        );
      }
    }
    console.error("PATCH product failed", err);
    return NextResponse.json(
      { error: "No se pudo actualizar el producto" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request, { params }: Ctx) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No se envió archivo" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({
    where: { id },
    select: { id: true, code: true, status: true },
  });
  if (!product) {
    return NextResponse.json(
      { error: "Producto no encontrado" },
      { status: 404 }
    );
  }
  if (!product.code) {
    return NextResponse.json(
      { error: "El producto no tiene código asignado" },
      { status: 409 }
    );
  }
  if (product.status === "Retirado") {
    return NextResponse.json(
      {
        error:
          "Este producto fue retirado. Restáuralo antes de cambiar la foto.",
      },
      { status: 409 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const upload = await uploadProductImage(buffer, product.code);

  const updated = await prisma.product.update({
    where: { id: product.id },
    data: { picture: upload.secure_url },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({
    where: { id },
    select: { status: true },
  });

  if (!product) {
    return NextResponse.json(
      { error: "Producto no encontrado" },
      { status: 404 }
    );
  }

  const reservedCount = await countActiveReservations(id);
  if (reservedCount > 0) {
    return NextResponse.json(
      {
        error:
          "No se puede retirar un producto con unidades apartadas. Libera los apartados primero.",
        reservedCount,
      },
      { status: 409 }
    );
  }

  // Soft delete — flip to "Retirado" so the row stays for audit / sales history.
  const updated = await prisma.product.update({
    where: { id },
    data: { status: "Retirado" },
  });

  return NextResponse.json({ success: true, product: updated });
}
