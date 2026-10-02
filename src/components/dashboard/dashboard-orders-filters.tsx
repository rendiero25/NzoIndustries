"use client";

import { useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { OrdersFilterDropdown } from "@/components/dashboard/orders-filter-dropdown";
import { ORDER_STATUS_FILTER_OPTIONS, type OrderStatus } from "@/lib/constants/order-status-labels";
import type { OrderSortOption } from "@/lib/data/dashboard-user";
import { Button } from "@/components/ui/button";

type Category = { id: string; name: string; slug: string };

type Props = {
  categories?: Category[];
  sort?: OrderSortOption;
};

const SORT_OPTIONS: { value: OrderSortOption; label: string }[] = [
  { value: "newest", label: "Terbaru" },
  { value: "oldest", label: "Terlama" },
  { value: "total_desc", label: "Total tertinggi" },
  { value: "total_asc", label: "Total terendah" },
];

const ALL_STATUS_VALUE = "__all__";
const ALL_CATEGORY_VALUE = "__all__";

function buildUrl(status: string, q: string, category: string, sort: string) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (q.trim()) params.set("q", q.trim());
  if (category) params.set("category", category);
  if (sort && sort !== "newest") params.set("sort", sort);
  const qs = params.toString();
  return qs ? `/dashboard/orders?${qs}` : "/dashboard/orders";
}

export function DashboardOrdersFilters({ categories = [], sort: sortProp = "newest" }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = (searchParams.get("status") ?? "") as OrderStatus | "";
  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "";
  const sort = (searchParams.get("sort") ?? sortProp) as OrderSortOption;
  const inputRef = useRef<HTMLInputElement>(null);

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
      ...categories.map((c) => ({ value: c.id, label: c.name })),
    ],
    [categories],
  );

  const navigate = (newStatus: string, newQ: string, newCategory: string, newSort: string) => {
    router.push(buildUrl(newStatus, newQ, newCategory, newSort));
  };

  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <form
        className="relative flex-1 sm:max-w-xs"
        onSubmit={(e) => {
          e.preventDefault();
          navigate(status, inputRef.current?.value ?? "", category, sort);
        }}
      >
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          defaultValue={q}
          placeholder="Cari nomor pesanan atau nama produk…"
          className="h-8 w-full rounded-md border border-border bg-white pr-8 pl-9 text-sm text-foreground outline-none placeholder:text-[#aaa] focus:border-foreground focus:ring-2 focus:ring-foreground/15"
        />
        {q ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Hapus pencarian"
            className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => {
              if (inputRef.current) inputRef.current.value = "";
              navigate(status, "", category, sort);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </form>

      <OrdersFilterDropdown
        aria-label="Filter status pesanan"
        value={status || ALL_STATUS_VALUE}
        options={statusOptions}
        onValueChange={(v) =>
          navigate(v === ALL_STATUS_VALUE ? "" : v, inputRef.current?.value ?? q, category, sort)
        }
      />

      {categories.length > 0 ? (
        <OrdersFilterDropdown
          aria-label="Filter kategori produk"
          value={category || ALL_CATEGORY_VALUE}
          options={categoryOptions}
          onValueChange={(v) =>
            navigate(status, inputRef.current?.value ?? q, v === ALL_CATEGORY_VALUE ? "" : v, sort)
          }
        />
      ) : null}

      <OrdersFilterDropdown
        aria-label="Urutkan pesanan"
        value={sort}
        options={SORT_OPTIONS}
        onValueChange={(v) =>
          navigate(status, inputRef.current?.value ?? q, category, v as OrderSortOption)
        }
      />
    </div>
  );
}
