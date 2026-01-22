// user-profile.tsx (componente cliente)
"use client";
import { supabaseClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export function UserProfile() {
  const [username, setUsername] = useState<string>("Administrador");

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) {
        setUsername(user.email || "Administrador");
      }
    };
    fetchUser();
  }, []);

  return (
    <div className="flex flex-col gap-0.5 leading-none p-2 text-sm">
      <span className="font-medium capitalize">{username}</span>
    </div>
  );
}
