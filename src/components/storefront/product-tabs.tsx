"use client";

import type { ReactNode } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type ProductTab = { value: string; label: string; content: ReactNode };

/** Tabs PDP: Deskripsi | Spesifikasi | Kecocokan kendaraan | Cara pasang | Ulasan. Konten dirender server. */
export function ProductTabs({ tabs }: { tabs: ProductTab[] }) {
  if (!tabs.length) return null;
  return (
    <Tabs defaultValue={tabs[0]!.value} className="gap-6">
      <TabsList
        variant="line"
        className="scrollbar-none w-full justify-start overflow-x-auto border-b border-border"
      >
        {tabs.map((t) => (
          <TabsTrigger key={t.value} value={t.value} className="shrink-0">
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((t) => (
        <TabsContent key={t.value} value={t.value} className="max-w-3xl">
          {t.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
