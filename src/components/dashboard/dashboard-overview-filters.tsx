"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import { OrdersFilterDropdown } from "@/components/dashboard/orders-filter-dropdown";
import { ORDER_STATUS_FILTER_OPTIONS, type OrderStatus } from "@/lib/constants/order-status-labels";
import type { StoreHeaderCategoryRow } from "@/lib/data/store-header-server";
import { cn } from "@/lib/utils";

const ALL_STATUS_VALUE = "__all__";
const ALL_CATEGORY_VALUE = "__all__";

type DashboardOverviewFiltersProps = {
  categories: StoreHeaderCategoryRow[];
  className?: string;
};

export function DashboardOverviewFilters({ categories, className }: DashboardOverviewFiltersProps) {
  const router = useRouter();

  const statusOptions = useMemo(
    () =>
      ORDER_STATUS_FILTER_OPTIONS.map((opt) => ({
        value: opt.value || ALL_STATUS_VALUE,
        label: opt.label,
      })),
    [],
  );

  const categoryOptions = useMemo(
    () => [
      { value: ALL_CATEGORY_VALUE, label: "Semua kategori" },
      ...categories.map((c) => ({ value: c.slug, label: c.name })),
    ],
    [categories],
  );

  return (
    <div
      className={cn(
        "flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-end sm:justify-end sm:gap-3",
        className,
      )}
    >
      <div className="flex w-full min-w-0 flex-col gap-1.5 sm:w-auto">
        <span className="text-xs font-semibold text-[#7a7a7a] uppercase">Status pesanan</span>
        <OrdersFilterDropdown
          aria-label="Status pesanan"
          value={ALL_STATUS_VALUE}
          options={statusOptions}
          className="sm:min-w-[12.5rem]"
          onValueChange={(v) => {
            const status = v === ALL_STATUS_VALUE ? "" : (v as OrderStatus);
            router.push(
              status
                ? `/dashboard/orders?status=${encodeURIComponent(status)}`
                : "/dashboard/orders",
            );
          }}
        />
      </div>

      {categories.length > 0 ? (
        <div className="flex w-full min-w-0 flex-col gap-1.5 sm:w-auto">
          <span className="text-xs font-semibold text-[#7a7a7a] uppercase">Kategori produk</span>
          <OrdersFilterDropdown
            aria-label="Kategori produk"
            value={ALL_CATEGORY_VALUE}
            options={categoryOptions}
            className="sm:min-w-[11.5rem]"
            onValueChange={(v) => {
              const slug = v === ALL_CATEGORY_VALUE ? "" : v;
              router.push(slug ? `/products?category=${encodeURIComponent(slug)}` : "/products");
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
