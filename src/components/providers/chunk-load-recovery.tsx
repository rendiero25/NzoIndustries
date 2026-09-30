"use client";

import { useEffect } from "react";

import { isChunkLoadFailure } from "@/lib/client/chunk-load-recovery";

const RECOVERY_KEY = "nzo:chunk-load-recovery-at";
const RECOVERY_COOLDOWN_MS = 30_000;

function reloadForChunkFailure(): boolean {
  try {
    const lastRecovery = Number(sessionStorage.getItem(RECOVERY_KEY));

    if (Date.now() - lastRecovery < RECOVERY_COOLDOWN_MS) {
      return false;
    }

    sessionStorage.setItem(RECOVERY_KEY, String(Date.now()));
  } catch {
    // Continue with a reload if sessionStorage is unavailable.
  }

  window.location.reload();
  return true;
}

export function ChunkLoadRecovery() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (isChunkLoadFailure(event.error ?? event.message)) {
        reloadForChunkFailure();
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isChunkLoadFailure(event.reason) && reloadForChunkFailure()) {
        event.preventDefault();
      }
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}
