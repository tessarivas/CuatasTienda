"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, UserPen } from "lucide-react";
import { toast } from "@/lib/toast";

type MeResponse = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

// Mi Perfil: mismo acomodo que las demás páginas (título + leyenda gris,
// tarjeta con icono y título) y sin colores: los datos de la cuenta.
export default function ProfilePage() {
  const [me, setMe] = React.useState<MeResponse | null>(null);
  const [name, setName] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me");
        if (!res.ok) {
          const { error: message } = await res.json();
          if (!cancelled) toast.error(message ?? "No se pudo cargar el perfil");
          return;
        }
        const data: MeResponse = await res.json();
        if (cancelled) return;
        setMe(data);
        setName(data.name);
      } catch {
        if (!cancelled) toast.error("No se pudo cargar el perfil");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const trimmed = name.trim();
  const changed = !!me && trimmed !== me.name;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!changed || !trimmed || isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const { error: message } = await res.json();
        toast.error(message ?? "No se pudo guardar el perfil");
        return;
      }
      const data: MeResponse = await res.json();
      setMe(data);
      setName(data.name);
      toast.success("Perfil actualizado");
    } catch {
      toast.error("No se pudo guardar el perfil");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">Mi Perfil</h1>
        <p className="text-sm text-muted-foreground">Tus datos dentro del panel de la tienda.</p>
      </div>

      {isLoading ? (
        // Mismo loader que suppliers/[id].
        <div className="flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Cargando perfil...</p>
          </div>
        </div>
      ) : !me ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No se pudo cargar el perfil. Recarga la página para intentar de nuevo.
        </p>
      ) : (
        <div className="max-w-2xl">
          {/* Datos que se pueden cambiar. */}
          <Card className="gap-4">
            <CardHeader>
              <div className="flex items-center gap-2">
                <UserPen className="h-5 w-5" />
                <CardTitle className="text-lg">Datos de la cuenta</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    type="text"
                    required
                    maxLength={100}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Así apareces en los tickets (&quot;Atendió&quot;), en los cortes de caja y en los reportes.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Correo</Label>
                  <Input id="email" type="email" value={me.email} readOnly disabled />
                  <p className="text-xs text-muted-foreground">
                    Con este correo entras al panel. Para cambiarlo, pide ayuda a quien administra el sistema.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-4">
                  {me.createdAt && (
                    <p className="mr-auto text-xs text-muted-foreground">
                      Usas el panel desde el{" "}
                      {new Date(me.createdAt).toLocaleDateString("es-MX", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                      .
                    </p>
                  )}
                  <Button type="submit" className="w-full cursor-pointer sm:w-auto" disabled={!changed || !trimmed || isSaving}>
                    {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
                    {isSaving ? "Guardando..." : "Guardar cambios"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
