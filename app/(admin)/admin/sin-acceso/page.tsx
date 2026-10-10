"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Loader2, LogOut, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "@/lib/toast"

// A donde proxy.ts manda a quien inició sesión pero no es ADMIN: hoy el panel
// completo es sólo para administradores. Mismo aspecto que el login; la única
// acción es cerrar sesión para entrar con otra cuenta.
export default function Page() {
  const router = useRouter()
  const [isLeaving, setIsLeaving] = useState(false)

  const handleLogout = async () => {
    setIsLeaving(true)
    try {
      await fetch("/api/auth", { method: "DELETE" })
      router.replace("/admin/login")
    } catch {
      toast.error("No se pudo cerrar la sesión")
      setIsLeaving(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-6">
            <Image src="/LOGO_CUATAS.svg" alt="Cuatas Tienda" width={120} height={120} priority />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Cuatas Tienda</h1>
          <p className="mt-1 text-muted-foreground">Panel de Administración</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-full bg-muted p-4">
              <ShieldAlert className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold">Tu cuenta no tiene acceso al panel</p>
              <p className="text-sm text-muted-foreground">
                El panel es sólo para administradores. Si necesitas entrar, pide a un
                administrador que cambie tu cuenta.
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full cursor-pointer"
              onClick={handleLogout}
              disabled={isLeaving}
            >
              {isLeaving ? <Loader2 className="animate-spin" /> : <LogOut />}
              {isLeaving ? "Cerrando sesión…" : "Cerrar sesión"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
