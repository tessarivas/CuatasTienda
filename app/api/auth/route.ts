// Controller for authentication routes
import { NextResponse } from "next/server"
import { supabaseServerClient } from "@/lib/supabase/server"

// GET method to fetch the current authenticated user
export async function GET() {
  const supabase = await supabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  // Sin sesión Supabase devuelve { user: null, error: null }: hay que mirar
  // `!user` además de `error`, si no esto responde 200 con body null y
  // cualquier cliente que haga `if (res.ok)` se lo cree.
  if (error || !user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
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

  // No se devuelve `data.session`: lleva el access token y el refresh token en
  // el body. Las cookies que ya puso supabaseServerClient() son suficientes.
  return NextResponse.json({ user: data.user });
}

// No hay alta de cuenta por API a propósito. Era un PUT público y sin throttle,
// así que cualquiera podía registrarse y entrar al panel. Las altas se hacen
// desde el dashboard de Supabase.

// DELETE method to log out the current user
export async function DELETE() {
  const supabase = await supabaseServerClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ message: "Signed out" })
}
