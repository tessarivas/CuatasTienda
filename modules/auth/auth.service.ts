import { supabaseServerClient } from "@/lib/supabase/server"

export async function getCurrentUser() {
  const supabase = await supabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error) throw error
  return user
}