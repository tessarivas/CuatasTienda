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


// POST: iniciar sesión con correo y contraseña.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const { email, password } = body as { email?: unknown; password?: unknown };
  if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
    return NextResponse.json(
      { error: "Escribe tu correo y tu contraseña" },
      { status: 400 }
    );
  }

  const supabase = await supabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    // Siempre el mismo mensaje: el de Supabase (en inglés) distingue "correo
    // sin confirmar" de "credenciales inválidas", y eso le dice a un atacante
    // qué correos tienen cuenta. Los límites de intentos sí se avisan aparte.
    if (error.status === 429) {
      return NextResponse.json(
        { error: "Demasiados intentos. Espera unos minutos y vuelve a intentar." },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: "Correo o contraseña incorrectos" },
      { status: 401 }
    );
  }

  // No se devuelve `data.session`: lleva el access token y el refresh token en
  // el body. Las cookies que ya puso supabaseServerClient() son suficientes.
  return NextResponse.json({ user: data.user });
}

// No hay alta de cuenta por API a propósito. Era un PUT público y sin throttle,
// así que cualquiera podía registrarse y entrar al panel. Las altas se hacen
// desde el dashboard de Supabase, que además tiene apagado "Allow new users
// to sign up": la llave anon es pública, y con el registro de Supabase
// prendido cualquiera podía crearse una cuenta sin pasar por esta API.

// DELETE method to log out the current user
export async function DELETE() {
  const supabase = await supabaseServerClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ message: "Signed out" })
}
