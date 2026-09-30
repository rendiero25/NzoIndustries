"use client";

import { ThemeProvider } from "next-themes";

import { ChunkLoadRecovery } from "@/components/providers/chunk-load-recovery";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/providers/auth-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <TooltipProvider delayDuration={300}>
        <ChunkLoadRecovery />
        <AuthProvider>{children}</AuthProvider>
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  );
}
