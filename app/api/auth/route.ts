// Controller for authentication routes
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/modules/auth/auth.service"
import { supabaseServerClient } from "@/lib/supabase/server"

// GET method to fetch the current authenticated user
export async function GET() {
  const supabase = await supabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  return NextResponse.json(user)
}


// (POST method can be added here for login, logout, etc.)
export async function POST(req: Request) {
  const { email, password } = await req.json();
  const supabase = await supabaseServerClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  console.log("User data from Supabase Auth:", data.user); // Log the user data

  return NextResponse.json({
    user: data.user,
    session: data.session,
  });
}


// SING UP method to register a new user
export async function PUT(req: Request) {
  const { email, password } = await req.json()
  const supabase = await supabaseServerClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data)
}

// DELETE method to log out the current user
export async function DELETE() {
  const supabase = await supabaseServerClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ message: "Signed out" })
}
