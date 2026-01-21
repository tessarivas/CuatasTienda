// Hook to manage authentication state
import { useState, useEffect } from "react"
import { supabaseServerClient } from "@/lib/supabase/server"
import { SupabaseClient } from "@supabase/supabase-js"
import { User } from "@supabase/supabase-js"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
    useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await SupabaseClient.auth.getUser()
        setUser(data.user)
      } catch (err) {
        setError("Failed to fetch user")
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
}, [])

  return { user, loading, error }
}
