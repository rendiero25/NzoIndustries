"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

import type { SpendingByMonth } from "@/lib/data/dashboard-user";
import { Button } from "@/components/ui/button";

type Period = 3 | 6 | 12;

type Props = {
  data12: SpendingByMonth[];
};

function formatRupiahShort(value: number): string {
  if (value >= 1_000_000) return `Rp${(value / 1_000_000).toFixed(1)}jt`;
  if (value >= 1_000) return `Rp${(value / 1_000).toFixed(0)}rb`;
  return `Rp${value}`;
}

function formatRupiahFull(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

const PERIOD_OPTIONS: { label: string; value: Period }[] = [
  { label: "3 Bln", value: 3 },
  { label: "6 Bln", value: 6 },
  { label: "12 Bln", value: 12 },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-white px-3 py-2 shadow-sm">
      <p className="text-[12px] font-semibold text-foreground">{label}</p>
      <p className="mt-0.5 text-[13px] font-semibold text-foreground">
        {formatRupiahFull(payload[0].value)}
      </p>
    </div>
  );
}

export function SpendingChart({ data12 }: Props) {
  const [period, setPeriod] = useState<Period>(6);

  const sliced = data12.slice(-period);
  const hasData = sliced.some((d) => d.total > 0);
  const maxVal = Math.max(...sliced.map((d) => d.total), 0);

  return (
    <section className="mt-10 flex flex-col">
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-[21px] leading-[1.19] font-semibold text-foreground">Pengeluaran</h2>
        <div className="flex flex-wrap items-center gap-1.5">
          {PERIOD_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              type="button"
              variant={period === opt.value ? "primary" : "pearl"}
              size="xs"
              onClick={() => setPeriod(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <p className="mt-6 text-base leading-[1.47] text-steel-700">
          Belum ada data pengeluaran untuk periode ini.
        </p>
      ) : (
        <div className="mt-6 flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-white p-4 sm:p-5">
          <div className="min-h-[180px] flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sliced}
                margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                barCategoryGap="30%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#7a7a7a", fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={formatRupiahShort}
                  tick={{ fontSize: 11, fill: "#7a7a7a" }}
                  axisLine={false}
                  tickLine={false}
                  width={58}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(234,83,41,0.06)" }} />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {sliced.map((entry) => (
                    <Cell
                      key={entry.month}
                      fill={entry.total === maxVal && maxVal > 0 ? "#000000" : "#f0ede9"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 shrink-0 text-right text-[11px] text-muted-foreground">
            Total {period} bulan terakhir:{" "}
            <span className="font-semibold text-foreground">
              {formatRupiahFull(sliced.reduce((s, d) => s + d.total, 0))}
            </span>
          </p>
        </div>
      )}
    </section>
  );
}
