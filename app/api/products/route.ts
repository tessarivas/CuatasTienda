import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";
import {
  uploadProductImage,
  deleteProductImage,
} from "@/lib/cloudinary/product";
import { randomBytes } from "crypto";
import { Prisma } from "@/generated/prisma/client";

// GET: el POS usa la variante por defecto — sólo productos "Disponible" con
// stock libre (quantity > reservedCount). Admin (`?include=all`) devuelve
// todo excepto "Retirado" con el conteo de reservas para que el UI muestre
// disponibilidad. Cada producto incluye `reservedCount` = LayawayItem en
// Layaways activos.
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const includeAll = url.searchParams.get("include") === "all";

    const where = includeAll
      ? { status: { not: "Retirado" } }
      : { status: "Disponible" };

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            LayawayItem: {
              where: { Layaway: { status: "Activo" } },
            },
          },
        },
      },
    });

    const withCount = products.map(({ _count, ...p }) => ({
      ...p,
      reservedCount: _count.LayawayItem,
    }));

    // El POS sólo quiere productos con stock libre para vender.
    const filtered = includeAll
      ? withCount
      : withCount.filter(
          (p) => (p.quantity ?? 0) - p.reservedCount > 0
        );

    return NextResponse.json(filtered);
  } catch (err) {
    console.error("GET productos falló", err);
    return NextResponse.json([], { status: 500 });
  }
}

const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;

// Alfabeto sin caracteres ambiguos (0/O, 1/I/L).
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateProductCode(): string {
  const bytes = randomBytes(8);
  let suffix = "";
  for (let i = 0; i < 8; i++) {
    suffix += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return `CT-${suffix}`;
}

// POST: crear producto. Flujo:
//   1. Validar input + existencia del proveedor (404 temprano).
//   2. Generar un código único.
//   3. Si hay imagen, subirla a Cloudinary en `products/{code}/picture`.
//   4. Insertar la fila con la URL de la imagen ya poblada.
//   5. Si la inserción colisiona en `code` (P2002), borrar la imagen huérfana
//      y reintentar con otro código.
export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const title = (formData.get("title") as string | null)?.trim() ?? "";
    const rawPrice = formData.get("price");
    const quantity = Number(formData.get("quantity"));
    const supplierId = Number(formData.get("supplierId"));
    const rawType = (formData.get("type") as string | null) ?? "PRODUCT";
    const image = formData.get("image") as File | null;

    // (#1) `status` siempre se fuerza a "Disponible" al crear — los demás
    // estados sólo se alcanzan por flujos de negocio (apartado, venta, retiro).
    const status = "Disponible";

    // (#1) `type` debe ser uno de los dos valores del enum de Prisma.
    if (rawType !== "PRODUCT" && rawType !== "SERVICE") {
      return NextResponse.json(
        { error: "Tipo de producto inválido" },
        { status: 400 }
      );
    }
    const type: "PRODUCT" | "SERVICE" = rawType;

    const priceStr = typeof rawPrice === "string" ? rawPrice.trim() : "";
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
    const price = Number(priceStr).toFixed(2);

    if (!title || !quantity || !supplierId) {
      return NextResponse.json(
        { error: "Título, cantidad y proveedor son obligatorios" },
        { status: 400 }
      );
    }

    // (#4) Verificar que el proveedor exista antes de tocar Cloudinary / DB.
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true },
    });
    if (!supplier) {
      return NextResponse.json(
        { error: "Proveedor no encontrado" },
        { status: 404 }
      );
    }

    // Leer el buffer una sola vez (cada attempt lo re-sube al folder del nuevo code).
    const imageBuffer = image
      ? Buffer.from(await image.arrayBuffer())
      : null;

    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateProductCode();
      let pictureUrl: string | null = null;

      if (imageBuffer) {
        const upload = await uploadProductImage(imageBuffer, code);
        pictureUrl = upload.secure_url;
      }

      try {
        const product = await prisma.product.create({
          data: {
            title,
            price,
            quantity,
            status,
            code,
            picture: pictureUrl,
            type,
            Supplier: { connect: { id: supplierId } },
          },
        });
        return NextResponse.json(product, { status: 201 });
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002"
        ) {
          // Colisión de código: limpiamos la imagen huérfana y reintentamos.
          if (pictureUrl) {
            await deleteProductImage(code).catch(() => {});
          }
          continue;
        }
        // Cualquier otro error: limpiamos el upload para no dejar huérfanos.
        if (pictureUrl) {
          await deleteProductImage(code).catch(() => {});
        }
        throw err;
      }
    }

    return NextResponse.json(
      { error: "No se pudo generar un código único para el producto" },
      { status: 500 }
    );
  } catch (err) {
    console.error("POST producto falló", err);
    return NextResponse.json(
      { error: "No se pudo crear el producto" },
      { status: 500 }
    );
  }
}
