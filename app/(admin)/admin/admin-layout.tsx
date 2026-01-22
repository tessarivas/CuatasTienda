import { supabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/client";
import DashboardLayout from "@/app/(admin)/admin/dashboard/layout";
import { UsernameProvider } from "@/context/username-context";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await supabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  let username = "";

  if (authUser) {
    const dbUser = await prisma.user.findUnique({
      where: { id: authUser.id },
    });
    username = dbUser?.name || authUser.email || "";
  }

  return (
    <UsernameProvider initialUsername={username}>
      <DashboardLayout>{children}</DashboardLayout>
    </UsernameProvider>
  );
}
