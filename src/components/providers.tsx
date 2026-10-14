"use client";

import { ChunkLoadRecovery } from "@/components/providers/chunk-load-recovery";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/providers/auth-provider";

// Tanpa next-themes: storefront selalu light, dark mode admin dikelola
// `useAdminDarkMode` di admin-shell (design-system.md §2). Script inline
// next-themes memicu peringatan React 19 saat navigasi client.
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={300}>
      <ChunkLoadRecovery />
      <AuthProvider>{children}</AuthProvider>
      <Toaster />
    </TooltipProvider>
  );
}
