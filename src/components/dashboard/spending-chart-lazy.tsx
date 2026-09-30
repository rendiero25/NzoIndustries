"use client";

import dynamic from "next/dynamic";

import type { SpendingByMonth } from "@/lib/data/dashboard-user";

// Dynamic import di Client Component — satu-satunya tempat ssr: false diizinkan.
// Recharts (~150 KB gzip) tidak masuk bundle awal; dimuat setelah hydration.
const SpendingChart = dynamic(
  () => import("@/components/dashboard/spending-chart").then((m) => ({ default: m.SpendingChart })),
  {
    ssr: false,
    loading: () => (
      <div className="mt-10 h-[280px] animate-pulse rounded-2xl bg-[#f5f5f7]" aria-hidden />
    ),
  },
);

export function SpendingChartLazy({ data12 }: { data12: SpendingByMonth[] }) {
  return <SpendingChart data12={data12} />;
}
