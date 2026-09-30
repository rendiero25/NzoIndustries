"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PrintPageButton({ label = "Cetak" }: { label?: string }) {
  return (
    <Button type="button" variant="primary" onClick={() => window.print()}>
      <Printer size={15} />
      {label}
    </Button>
  );
}
