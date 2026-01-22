// app/(admin)/admin/admin-layout.tsx
import { supabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/client";
import DashboardLayout from "@/app/(admin)/admin/dashboard/layout";

export default async function AdminLayout({
  children,
  username,
}: {
  children: React.ReactNode;
  username?: string;
}) {
  const supabase = await supabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  console.log("Auth User:", authUser); // Log para verificar el usuario autenticado

 
  if (authUser) {
    console.log("Auth User ID:", authUser.id); // Log para verificar el ID del usuario autenticado
    const dbUser = await prisma.user.findUnique({
      where: { id: authUser.id },
    });
    console.log("DB User:", dbUser); // Log para verificar el usuario en la base de datos
    username = dbUser?.name || authUser.email || "a";
    console.log("Username:", username); // Log para verificar el nombre final
  } else {
    console.log("No authUser found"); // Log si no hay usuario autenticado
  }

  return <DashboardLayout username={username}>{children}</DashboardLayout>;
}
