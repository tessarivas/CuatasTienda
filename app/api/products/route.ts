import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";
import {
  uploadProductImage,
  deleteProductImage,
} from "@/lib/cloudinary/product";
import { randomBytes } from "crypto";
import { servicePrefixFor } from "@/lib/services/folio";
import { Prisma } from "@/generated/prisma/client";
import { supabaseServerClient } from "@/lib/supabase/server";

// Proyección para consumidores anónimos (catálogo público). Deja fuera
// supplierId, soldCount, code, quantity y reservedCount: son datos internos.
function toPublicProduct(p: {
  id: number;
  title: string;
  price: Prisma.Decimal;
  picture: string | null;
  type: string;
}) {
  return {
    id: p.id,
    title: p.title,
    price: p.price,
    picture: p.picture,
    type: p.type,
  };
}

// GET: el POS usa la variante por defecto — sólo productos "Disponible" con
// stock libre (quantity > reservedCount). Admin (`?include=all`) devuelve
// todo excepto "Retirado" con el conteo de reservas para que el UI muestre
// disponibilidad. Cada producto incluye `reservedCount` = LayawayItem en
// Layaways activos.
//
// Esta ruta es la única de /api que el middleware deja pasar sin sesión, para
// servir de catálogo público. Sin sesión se devuelve la proyección recortada y
// `?include=all` se rechaza; con sesión el comportamiento es el de siempre.
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const includeAll = url.searchParams.get("include") === "all";

    const supabase = await supabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const isAuthenticated = Boolean(user);

    if (includeAll && !isAuthenticated) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

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
              where: { status: "Activo", Layaway: { status: "Activo" } },
            },
          },
        },
      },
    });

    const withCount = products.map(({ _count, ...p }) => ({
      ...p,
      reservedCount: _count.LayawayItem,
    }));

    // El POS sólo quiere items vendibles. Los servicios (quantity = null)
    // no tienen inventario: siempre están disponibles. Los productos sólo
    // pasan si hay unidades libres (quantity - reservedCount > 0).
    const filtered = includeAll
      ? withCount
      : withCount.filter((p) =>
          p.type === "SERVICE"
            ? true
            : (p.quantity ?? 0) - p.reservedCount > 0
        );

    if (!isAuthenticated) {
      return NextResponse.json(filtered.map(toPublicProduct));
    }

    return NextResponse.json(filtered);
  } catch (err) {
    console.error("GET productos falló", err);
    return NextResponse.json([], { status: 500 });
  }
}

const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;

// Alfabeto sin caracteres ambiguos (0/O, 1/I/L).
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

// Código del producto: letras del proveedor (las mismas del folio de sus
// pedidos de servicio, p. ej. CU para Cuatas) + 8 caracteres al azar:
// CU-PAV6ANCG. No cambia nunca, aunque después cambien las letras del
// proveedor o el producto pase a otro: ya puede estar impreso en etiquetas.
// (Antes de 2026-10-08 todos empezaban con "CT-"; se cambiaron una vez.)
function generateProductCode(prefix: string): string {
  const bytes = randomBytes(8);
  let suffix = "";
  for (let i = 0; i < 8; i++) {
    suffix += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return `${prefix}-${suffix}`;
}

// POST: crear producto. Flujo:
//   1. Validar input + existencia del proveedor (404 temprano).
//   2. Generar un código único (letras del proveedor + 8 al azar).
//   3. Si hay imagen, subirla a Cloudinary en `products/{code}/picture`.
//   4. Insertar la fila con la URL de la imagen ya poblada.
//   5. Si la inserción colisiona en `code` (P2002), borrar la imagen huérfana
//      y reintentar con otro código.
export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const title = (formData.get("title") as string | null)?.trim() ?? "";
    const rawPrice = formData.get("price");
    const rawQuantity = formData.get("quantity");
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
    const isService = type === "SERVICE";

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

    // Los servicios no tienen inventario. Ignoramos cualquier `quantity`
    // enviado y persistimos `null`. Los productos sí exigen cantidad > 0.
    let quantity: number | null;
    if (isService) {
      quantity = null;
    } else {
      const parsed = Number(rawQuantity);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return NextResponse.json(
          { error: "La cantidad debe ser un entero positivo" },
          { status: 400 }
        );
      }
      quantity = parsed;
    }

    if (!title || !supplierId) {
      return NextResponse.json(
        { error: "Título y proveedor son obligatorios" },
        { status: 400 }
      );
    }

    // (#4) Verificar que el proveedor exista antes de tocar Cloudinary / DB.
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true, servicePrefix: true, businessName: true, name: true },
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
      const code = generateProductCode(servicePrefixFor(supplier));
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
