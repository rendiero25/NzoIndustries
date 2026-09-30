import {
  useAuthStore,
  selectUser,
  selectProfile,
  selectIsAuthenticated,
  selectIsAdmin,
  selectIsLoading,
  selectIsInitialized,
  selectRole,
} from "@/store/auth-store";

/**
 * Hook utama untuk mengakses auth state di seluruh aplikasi.
 * Gunakan hook ini di Client Components yang butuh data user/profile.
 */
export function useAuth() {
  const user = useAuthStore(selectUser);
  const profile = useAuthStore(selectProfile);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const isAdmin = useAuthStore(selectIsAdmin);
  const isLoading = useAuthStore(selectIsLoading);
  const isInitialized = useAuthStore(selectIsInitialized);
  const role = useAuthStore(selectRole);

  return {
    user,
    profile,
    isAuthenticated,
    isAdmin,
    isLoading,
    isInitialized,
    role,
  };
}
