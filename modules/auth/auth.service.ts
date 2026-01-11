import { supabaseServerClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/db/prisma"

export async function getCurrentUser() {
  const supabase = await supabaseServerClient()
  const { data } = await supabase.auth.getUser()
  
  if (!data.user) return null

  return prisma.user.findUnique({
    where: { id: data.user.id },
  })
}