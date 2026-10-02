"use client";

import { useEffect } from "react";

import { createClient } from "@/lib/supabase/legacy/client";
import { useAuthStore } from "@/store/auth-store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setProfile, setLoading, setInitialized, reset } = useAuthStore();

  useEffect(() => {
    const supabase = createClient();

    async function fetchProfile(userId: string) {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      setProfile(data);
    }

    // PENTING: callback onAuthStateChange berjalan sambil memegang lock auth.
    // Jangan `await` panggilan Supabase di dalamnya (deadlock) — jadwalkan
    // dengan setTimeout agar berjalan setelah lock dilepas.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user ?? null;
      setUser(user);

      if (!user) {
        reset();
        setInitialized(true);
        return;
      }

      const existing = useAuthStore.getState().profile;
      const needsProfile =
        event === "USER_UPDATED" ||
        ((event === "INITIAL_SESSION" || event === "SIGNED_IN") &&
          (!existing || existing.id !== user.id));

      setTimeout(() => {
        void (needsProfile ? fetchProfile(user.id) : Promise.resolve()).finally(() => {
          setLoading(false);
          setInitialized(true);
        });
      }, 0);
    });

    return () => subscription.unsubscribe();
  }, [setUser, setProfile, setLoading, setInitialized, reset]);

  return <>{children}</>;
}
