// app/api/sync-user/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export async function POST(req: Request) {
  try {
    const { userId, email } = await req.json();
    console.log("Syncing user:", { userId, email }); // Log input data

    const user = await prisma.user.upsert({
      where: { id: userId },
      update: {
        name: email,
        role: "USER",
      },
      create: {
        id: userId,
        name: email,
        role: "USER",
      },
    });

    console.log("Upsert result:", user); // Log the result
    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("Error syncing user:", error);
    return NextResponse.json(
      { error: "Failed to sync user", details: error.message },
      { status: 500 }
    );
  }
}
