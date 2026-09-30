"use client";

import { useCallback, useRef, useState } from "react";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  variant?: "default" | "destructive";
};

/**
 * Pengganti `window.confirm()` (D-10). Render `dialog` di JSX, lalu
 * `if (!(await confirm({ title: "Hapus?" }))) return;`
 */
export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((next: ConfirmOptions) => {
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setOptions(null);
  }, []);

  const dialog = (
    <ConfirmDialog
      open={options !== null}
      onOpenChange={(open) => {
        if (!open) settle(false);
      }}
      title={options?.title ?? ""}
      description={options?.description}
      confirmLabel={options?.confirmLabel ?? "Hapus"}
      variant={options?.variant ?? "destructive"}
      onConfirm={() => settle(true)}
    />
  );

  return { confirm, dialog };
}
