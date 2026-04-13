"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type MeResponse = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export default function ProfilePage() {
  const [me, setMe] = React.useState<MeResponse | null>(null);
  const [name, setName] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me");
        if (!res.ok) {
          const { error: message } = await res.json();
          if (!cancelled) setError(message ?? "No se pudo cargar el perfil");
          return;
        }
        const data: MeResponse = await res.json();
        if (cancelled) return;
        setMe(data);
        setName(data.name);
      } catch {
        if (!cancelled) setError("No se pudo cargar el perfil");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSaving(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const { error: message } = await res.json();
        setError(message ?? "No se pudo guardar el perfil");
        return;
      }
      const data: MeResponse = await res.json();
      setMe(data);
      setName(data.name);
      setSuccess("Perfil actualizado");
    } catch {
      setError("No se pudo guardar el perfil");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 max-w-xl">
      <h1 className="text-xl font-semibold mb-4">Mi perfil</h1>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : (
        <Card>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                {error && (
                  <p className="text-sm font-medium text-red-600">{error}</p>
                )}
                {success && (
                  <p className="text-sm font-medium text-emerald-600">
                    {success}
                  </p>
                )}
                <Field>
                  <FieldLabel htmlFor="email">Correo</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    value={me?.email ?? ""}
                    readOnly
                    disabled
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="name">Nombre</FieldLabel>
                  <Input
                    id="name"
                    type="text"
                    required
                    maxLength={100}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </Field>
                <Field>
                  <Button
                    type="submit"
                    className="w-full cursor-pointer"
                    disabled={isSaving || name.trim().length === 0}
                  >
                    {isSaving ? "Guardando..." : "Guardar"}
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
