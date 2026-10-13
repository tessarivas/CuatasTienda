// proxy.ts (antes middleware.ts; Next 16 renombró la convención).
//
// En Netlify el proxy corre como Edge Function, donde no carga `pg` ni el
// cliente de Prisma: el deploy falla si este archivo importa (aunque sea de
// rebote) algo que llegue a la base. Por eso aquí sólo va lo ligero (sesión
// con @supabase/ssr) y el rol se le pregunta a GET /api/auth/role, que sí
// corre en un servidor normal. No importes lib/db ni lib/auth/roles aquí.
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

// Rutas que piden sesión pero no rol de ADMIN:
//  - /api/sync-user   crea la fila de User al iniciar sesión; sin ella aún no
//                     hay rol que revisar (y el primer usuario se vuelve ADMIN).
//  - /admin/sin-acceso  a donde se manda a quien no es ADMIN; gatearla con el
//                     rol sería un bucle.
//  - /api/auth/role   la que contesta el rol; revisarle el rol sería llamarse
//                     a sí misma.
const ROLE_PATH = "/api/auth/role"
const NO_ROLE_PATHS = new Set(["/api/sync-user", "/admin/sin-acceso", ROLE_PATH])

// Pregunta a /api/auth/role si la sesión es ADMIN, con las mismas cookies
// (ya refrescadas por getUser). null = no se pudo saber.
async function fetchIsAdmin(request: NextRequest): Promise<boolean | null> {
  try {
    const res = await fetch(new URL(ROLE_PATH, request.url), {
      headers: { cookie: request.headers.get("cookie") ?? "" },
      cache: "no-store",
    })
    if (!res.ok) return null
    const body: { isAdmin?: unknown } = await res.json()
    return body.isAdmin === true
  } catch {
    return null
  }
}

export async function proxy(request: NextRequest) {
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

  const isApi = request.nextUrl.pathname.startsWith("/api")

  if (!user) {
    // Las APIs contestan 401 JSON, nunca un redirect: un 302 a HTML rompe
    // cualquier fetch y llega al cliente como un error de parseo confuso.
    if (isApi) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const loginUrl = new URL("/admin/login", request.url)
    return NextResponse.redirect(loginUrl)
  }

  if (NO_ROLE_PATHS.has(request.nextUrl.pathname)) {
    return supabaseResponse
  }

  // El panel completo es sólo para ADMIN. El rol vive en User.role y se cambia
  // desde el Table Editor de Supabase; se lee en cada petición para que un
  // cambio aplique en la siguiente carga, sin cerrar sesión. Sin fila (aún no
  // sincronizado) cuenta como sin acceso.
  const isAdmin = await fetchIsAdmin(request)

  if (isAdmin === null && isApi) {
    return NextResponse.json(
      { error: "No se pudo revisar tu acceso, intenta de nuevo" },
      { status: 503 }
    )
  }
  if (!isAdmin) {
    if (isApi) {
      return NextResponse.json(
        { error: "Tu cuenta no tiene acceso al panel" },
        { status: 403 }
      )
    }
    return NextResponse.redirect(new URL("/admin/sin-acceso", request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
}
