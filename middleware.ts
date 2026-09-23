// middleware.ts
import { createServerClient } from "@supabase/ssr"
import { NextRequest, NextResponse } from "next/server"

// Rutas alcanzables sin sesión. Cada excepción tiene un motivo concreto:
//
//  - /api/auth      es la primitiva de login. Gatearla sería un deadlock: no
//                   puedes autenticarte sin poder llamarla. GET (probe) y
//                   DELETE (logout) también pasan; el handler decide, y
//                   bloquear el logout con 401 dejaría cookies rancias sin
//                   forma de limpiarlas.
//  - GET /api/products  catálogo público. Match exacto de path y método: POST
//                   /api/products y todo /api/products/[id] siguen protegidos.
//                   El handler recorta los campos y rechaza ?include=all
//                   cuando no hay sesión.
//  - /admin/login   evita el bucle de redirección.
function isPublicPath(request: NextRequest): boolean {
  const { pathname } = request.nextUrl

  if (pathname === "/admin/login") return true
  if (pathname === "/api/auth") return true
  if (pathname === "/api/products" && request.method === "GET") return true

  return false
}

export async function middleware(request: NextRequest) {
  if (isPublicPath(request)) {
    return NextResponse.next()
  }

  // Patrón oficial de @supabase/ssr: la respuesta tiene que arrastrar las
  // cookies refrescadas, si no el refresh del token no se propaga y la sesión
  // caduca sola. No ejecutar nada entre createServerClient y getUser.
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() y no getSession(): getSession lee la cookie sin revalidarla
  // contra el servidor de Auth, así que no sirve como frontera de seguridad.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Las APIs contestan 401 JSON, nunca un redirect: un 302 a HTML rompe
    // cualquier fetch y llega al cliente como un error de parseo confuso.
    if (request.nextUrl.pathname.startsWith("/api")) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const loginUrl = new URL("/admin/login", request.url)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
}
