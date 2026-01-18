// Controller for authentication routes
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/modules/auth/auth.service"

export async function GET() {
  try {
    const user = await getCurrentUser()
    return NextResponse.json(user)
  } catch (error) {
    return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
  }
}