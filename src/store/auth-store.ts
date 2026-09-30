import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { User } from "@supabase/supabase-js";
import type { Tables } from "@/types/supabase";

type ProfileRow = Tables<"profiles">;

type AuthState = {
  user: User | null;
  profile: ProfileRow | null;
  isLoading: boolean;
  isInitialized: boolean;
};

type AuthActions = {
  setUser: (user: User | null) => void;
  setProfile: (profile: ProfileRow | null) => void;
  setLoading: (isLoading: boolean) => void;
  setInitialized: (isInitialized: boolean) => void;
  reset: () => void;
};

export type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  profile: null,
  isLoading: true,
  isInitialized: false,
};

export const useAuthStore = create<AuthStore>()(
  devtools(
    (set) => ({
      ...initialState,

      setUser: (user) => set({ user }, false, "setUser"),

      setProfile: (profile) => set({ profile }, false, "setProfile"),

      setLoading: (isLoading) => set({ isLoading }, false, "setLoading"),

      setInitialized: (isInitialized) => set({ isInitialized }, false, "setInitialized"),

      reset: () => set({ user: null, profile: null, isLoading: false }, false, "reset"),
    }),
    { name: "auth-store" },
  ),
);

// Selectors
export const selectUser = (state: AuthStore) => state.user;
export const selectProfile = (state: AuthStore) => state.profile;
export const selectIsAuthenticated = (state: AuthStore) => !!state.user;
export const selectIsAdmin = (state: AuthStore) => state.profile?.role === "admin";
export const selectIsLoading = (state: AuthStore) => state.isLoading;
export const selectIsInitialized = (state: AuthStore) => state.isInitialized;
export const selectRole = (state: AuthStore) => state.profile?.role ?? "customer";
