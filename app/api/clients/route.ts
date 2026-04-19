import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";

// GET /api/clients?search=<name>
// Lista los clientes, con filtro opcional case-insensitive por nombre.
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.trim() ?? "";

    const clients = await prisma.client.findMany({
      where: search
        ? { name: { contains: search, mode: "insensitive" } }
        : undefined,
      orderBy: { name: "asc" },
    });

    return NextResponse.json(clients);
  } catch (err) {
    console.error("GET clientes falló", err);
    return NextResponse.json(
      { error: "No se pudieron cargar los clientes" },
      { status: 500 }
    );
  }
}

// POST /api/clients
// Crear cliente con saldo inicial 0.
export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    const input = body as { name?: unknown; cellphone?: unknown };

    if (typeof input.name !== "string" || input.name.trim().length === 0) {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
        { status: 400 }
      );
    }
    if (input.name.trim().length > 100) {
      return NextResponse.json(
        { error: "El nombre es demasiado largo" },
        { status: 400 }
      );
    }

    let cellphone: string | null = null;
    if (input.cellphone !== undefined && input.cellphone !== null) {
      if (typeof input.cellphone !== "string") {
        return NextResponse.json(
          { error: "Teléfono inválido" },
          { status: 400 }
        );
      }
      const trimmed = input.cellphone.trim();
      cellphone = trimmed.length > 0 ? trimmed : null;
    }

    const client = await prisma.client.create({
      data: {
        name: input.name.trim(),
        cellphone,
        currentBalance: "0.00",
      },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (err) {
    console.error("POST cliente falló", err);
    return NextResponse.json(
      { error: "No se pudo crear el cliente" },
      { status: 500 }
    );
  }
}
