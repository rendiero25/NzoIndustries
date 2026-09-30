"use client";

import dynamic from "next/dynamic";

const RevenueChart = dynamic(
  () => import("@/components/admin/revenue-chart").then((m) => ({ default: m.RevenueChart })),
  { ssr: false, loading: () => <div className="h-48 w-full" /> },
);
const OrdersChart = dynamic(
  () => import("@/components/admin/revenue-chart").then((m) => ({ default: m.OrdersChart })),
  { ssr: false, loading: () => <div className="h-48 w-full" /> },
);

type ChartData = { date: string; revenue: number; orders: number };

export function DashboardRevenueChart({ data }: { data: ChartData[] }) {
  return <RevenueChart data={data} />;
}

export function DashboardOrdersChart({ data }: { data: ChartData[] }) {
  return <OrdersChart data={data} />;
}
