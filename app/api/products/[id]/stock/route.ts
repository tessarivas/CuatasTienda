import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";
import { StockMovementType } from "@/generated/prisma/client";
import {
  requireUser,
  isUnsyncedUserError,
  unsyncedUserResponse,
} from "@/lib/auth/require-user";

type Ctx = { params: Promise<{ id: string }> };

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Tope defensivo para no meter una barbaridad por un dedazo.
const MAX_MOVEMENT = 1_000_000;

function isValidType(value: unknown): value is StockMovementType {
  return value === StockMovementType.Alta || value === StockMovementType.Retiro;
}

// POST /api/products/[id]/stock
// Movimiento de inventario que NO es una venta: alta de mercancía o retiro
// (merma, devolución al proveedor, daño). Payload:
//   { type: "Alta" | "Retiro", quantity: number, reason?: string, pickedUpBy?: string }
//
// `pickedUpBy` (nombre de quien recoge la mercancía, ej. repartidor) sólo se
// guarda cuando `type` es `Retiro`; si llega en una `Alta` se ignora en vez
// de rechazarse, para no romper por un campo que el cliente mandó de más.
//
// Es un endpoint aparte y no un PATCH de `quantity` a propósito:
//   1. Es un delta, no un valor absoluto — dos altas simultáneas se suman en
//      vez de pisarse.
//   2. Ajustar el saldo y escribir la bitácora tienen que ser atómicos.
//   3. Deja intacto el bloqueo de PATCH sobre price/quantity/supplierId con
//      apartados activos. Sumar stock sí se permite aquí porque nunca invalida
//      un apartado existente; bajarlo se valida contra las reservas.
export async function POST(req: Request, { params }: Ctx) {
  const { id: rawId } = await params;
  const productId = parseId(rawId);
  if (productId === null) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const { user: sessionUser, response } = await requireUser();
  if (response) return response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const input = body as {
    type?: unknown;
    quantity?: unknown;
    reason?: unknown;
    pickedUpBy?: unknown;
  };

  if (!isValidType(input.type)) {
    return NextResponse.json(
      { error: "El tipo de movimiento debe ser Alta o Retiro" },
      { status: 400 }
    );
  }

  const amount = Number(input.quantity);
  if (!Number.isInteger(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "La cantidad debe ser un número entero mayor a cero" },
      { status: 400 }
    );
  }
  if (amount > MAX_MOVEMENT) {
    return NextResponse.json(
      { error: "La cantidad excede el máximo permitido" },
      { status: 400 }
    );
  }

  let reason: string | null = null;
  if (input.reason !== undefined && input.reason !== null) {
    if (typeof input.reason !== "string") {
      return NextResponse.json({ error: "Motivo inválido" }, { status: 400 });
    }
    const trimmed = input.reason.trim();
    if (trimmed.length > 300) {
      return NextResponse.json(
        { error: "El motivo es demasiado largo" },
        { status: 400 }
      );
    }
    reason = trimmed.length > 0 ? trimmed : null;
  }

  let pickedUpBy: string | null = null;
  if (input.pickedUpBy !== undefined && input.pickedUpBy !== null) {
    if (typeof input.pickedUpBy !== "string") {
      return NextResponse.json(
        { error: "El nombre de quien recoge es inválido" },
        { status: 400 }
      );
    }
    const trimmed = input.pickedUpBy.trim();
    if (trimmed.length > 150) {
      return NextResponse.json(
        { error: "El nombre de quien recoge es demasiado largo" },
        { status: 400 }
      );
    }
    // Sólo tiene sentido en un retiro; se guarda como null en una alta aunque
    // el cliente lo mande.
    pickedUpBy =
      input.type === StockMovementType.Retiro && trimmed.length > 0
        ? trimmed
        : null;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { id: true, quantity: true, status: true, type: true },
      });

      if (!product) {
        return { error: "Producto no encontrado" as const, status: 404 };
      }
      if (product.status === "Retirado") {
        return {
          error:
            "Este producto fue retirado. Restáuralo antes de mover inventario." as const,
          status: 409,
        };
      }
      if (product.type === "SERVICE") {
        return {
          error: "Los servicios no manejan inventario" as const,
          status: 400,
        };
      }

      const current = product.quantity ?? 0;
      const next =
        input.type === StockMovementType.Alta
          ? current + amount
          : current - amount;

      if (next < 0) {
        return {
          error: "No puedes retirar más unidades de las que hay" as const,
          status: 409,
          disponible: current,
        };
      }

      // No se pueden retirar unidades que ya están apartadas por un cliente.
      const reservedCount = await tx.layawayItem.count({
        where: { productId, status: "Activo", Layaway: { status: "Activo" } },
      });
      if (next < reservedCount) {
        return {
          error:
            "No puedes dejar el stock por debajo de las unidades apartadas" as const,
          status: 409,
          reservedCount,
          maximoRetirable: Math.max(0, current - reservedCount),
        };
      }

      const movement = await tx.stockMovement.create({
        data: {
          productId,
          type: input.type as StockMovementType,
          quantity: amount,
          reason,
          pickedUpBy,
          createdBy: sessionUser.id,
        },
      });

      const updated = await tx.product.update({
        where: { id: productId },
        data: { quantity: next },
      });

      return { error: null, product: updated, movement };
    });

    if (result.error) {
      return NextResponse.json(
        {
          error: result.error,
          ...("reservedCount" in result
            ? {
                reservedCount: result.reservedCount,
                maximoRetirable: result.maximoRetirable,
              }
            : {}),
          ...("disponible" in result ? { disponible: result.disponible } : {}),
        },
        { status: result.status }
      );
    }

    return NextResponse.json(
      { product: result.product, movement: result.movement },
      { status: 201 }
    );
  } catch (err) {
    if (isUnsyncedUserError(err)) {
      return unsyncedUserResponse();
    }
    console.error("POST movimiento de stock falló", err);
    return NextResponse.json(
      { error: "No se pudo registrar el movimiento" },
      { status: 500 }
    );
  }
}

// GET /api/products/[id]/stock — bitácora del producto, más reciente primero.
// Ya disponible para la pantalla de historial que queda pendiente.
export async function GET(_req: Request, { params }: Ctx) {
  const { id: rawId } = await params;
  const productId = parseId(rawId);
  if (productId === null) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    const movements = await prisma.stockMovement.findMany({
      where: { productId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: { User: { select: { id: true, name: true } } },
    });
    return NextResponse.json(movements);
  } catch (err) {
    console.error("GET movimientos de stock falló", err);
    return NextResponse.json(
      { error: "No se pudieron cargar los movimientos" },
      { status: 500 }
    );
  }
}
