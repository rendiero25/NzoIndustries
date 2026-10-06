"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** Tab Terlaris / Terbaru di beranda (§5 no. 5); grid dirender server. */
export function HomeProductTabs({
  bestseller,
  newest,
}: {
  bestseller: ReactNode;
  newest: ReactNode;
}) {
  return (
    <section aria-labelledby="pilihan-part" className="nzo-container py-12 md:py-16">
      <Tabs defaultValue="bestseller" className="gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="pilihan-part" className="text-2xl md:text-[1.75rem]">
            Part pilihan
          </h2>
          <div className="flex items-center gap-4">
            <TabsList variant="line">
              <TabsTrigger value="bestseller">Terlaris</TabsTrigger>
              <TabsTrigger value="newest">Terbaru</TabsTrigger>
            </TabsList>
            <Link
              href="/products"
              className="text-sm font-semibold underline-offset-4 hover:underline max-sm:hidden"
            >
              Semua part
            </Link>
          </div>
        </div>
        <TabsContent value="bestseller">{bestseller}</TabsContent>
        <TabsContent value="newest">{newest}</TabsContent>
      </Tabs>
    </section>
  );
}
