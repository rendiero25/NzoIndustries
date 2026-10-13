"use client";

import { ScrollText } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { getImportLogs } from "@/server/actions/admin/catalog";
import type { ImportLogRow } from "@/server/queries/admin/catalog";

const LEVEL: Record<string, { label: string; variant: "destructive" | "secondary" | "outline" }> = {
  error: { label: "Gagal", variant: "destructive" },
  warning: { label: "Peringatan", variant: "secondary" },
  info: { label: "Info", variant: "outline" },
};

/** Detail log satu batch import (baris gagal/peringatan), dibaca saat dibuka. */
export function ImportLogButton({
  batchId,
  fileName,
}: {
  batchId: string;
  fileName: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<ImportLogRow[] | null>(null);
  const [pending, start] = useTransition();

  const show = () => {
    setOpen(true);
    if (logs) return;
    start(async () => {
      const res = await getImportLogs(batchId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setLogs(res.logs);
    });
  };

  return (
    <>
      <Button variant="ghost" size="sm" onClick={show}>
        <ScrollText /> Log
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Log import</SheetTitle>
            <SheetDescription className="truncate">
              {fileName ?? "Batch tanpa nama file"}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {pending || !logs ? (
              <div className="flex justify-center py-10">
                <Spinner />
              </div>
            ) : logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada catatan untuk batch ini.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {logs.map((l) => {
                  const level = LEVEL[l.level] ?? { label: l.level, variant: "outline" as const };
                  return (
                    <li key={l.id} className="flex flex-col gap-1 py-2 text-sm">
                      <span className="flex items-center gap-2">
                        <Badge variant={level.variant}>{level.label}</Badge>
                        {l.sku ? <span className="font-mono text-caption">{l.sku}</span> : null}
                      </span>
                      <span className="text-muted-foreground">{l.message}</span>
                    </li>
                  );
                })}
                {logs.length === 200 ? (
                  <li className="py-2 text-caption text-muted-foreground">
                    Menampilkan 200 catatan pertama.
                  </li>
                ) : null}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
