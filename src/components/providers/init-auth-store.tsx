"use client";

import { useLayoutEffect } from "react";
import type { User } from "@supabase/supabase-js";

import { useAuthStore } from "@/store/auth-store";
import type { Tables } from "@/types/supabase";

type Props = {
  user: User | null;
  profile: Tables<"profiles"> | null;
};

/**
 * Pre-populates the auth store with server-fetched data so components
 * like DashboardSidebar and StoreHeader don't have to wait for the
 * async AuthProvider.getUser() call to resolve.
 */
export function InitAuthStore({ user, profile }: Props) {
  const { setUser, setProfile, setLoading, setInitialized } = useAuthStore();

  useLayoutEffect(() => {
    setUser(user);
    // When user is authenticated but profile fetch failed (null), keep the
    // existing store profile instead of overwriting it with null.
    if (profile !== null || user === null) {
      setProfile(profile);
    }
    setLoading(false);
    setInitialized(true);
  }, [user, profile, setUser, setProfile, setLoading, setInitialized]);

  return null;
}
