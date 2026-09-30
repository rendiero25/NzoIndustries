"use client";

import { useTransition } from "react";
import { Ticket } from "lucide-react";
import { toast } from "sonner";

import { formatRupiah, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  AdminTableDeleteButton,
  AdminTableEditLink,
} from "@/components/admin/admin-table-row-actions";
import { toggleCouponActive, deleteCoupon } from "../_actions";

import { useConfirm } from "@/hooks/use-confirm";

export type CouponRow = {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  min_purchase: number;
  max_discount: number | null;
  max_usage: number | null;
  used_count: number;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;
};

function getCouponStatus(coupon: CouponRow): { label: string; className: string } {
  if (!coupon.is_active) {
    return { label: "Nonaktif", className: "bg-muted text-foreground" };
  }
  const now = new Date();
  if (coupon.valid_from && new Date(coupon.valid_from) > now) {
    return { label: "Terjadwal", className: "bg-brand/10 text-brand" };
  }
  if (coupon.valid_until && new Date(coupon.valid_until) < now) {
    return { label: "Kadaluarsa", className: "bg-muted text-foreground" };
  }
  if (coupon.max_usage !== null && coupon.used_count >= coupon.max_usage) {
    return { label: "Habis", className: "bg-muted text-foreground" };
  }
  return {
    label: "Aktif",
    className: "bg-emerald-500/15 text-emerald-800",
  };
}

function CouponActions({ coupon }: { coupon: CouponRow }) {
  const [isPending, startTransition] = useTransition();
  const { confirm, dialog } = useConfirm();

  const handleToggle = () => {
    startTransition(async () => {
      const { error } = await toggleCouponActive(coupon.id, !coupon.is_active);
      if (error) toast.error(error);
      else toast.success(coupon.is_active ? "Kupon dinonaktifkan." : "Kupon diaktifkan.");
    });
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Hapus kupon ini?",
      description: "Tindakan tidak bisa dibatalkan.",
    });
    if (!ok) return;
    startTransition(async () => {
      const { error } = await deleteCoupon(coupon.id);
      if (error) toast.error(error);
      else toast.success("Kupon dihapus.");
    });
  };

  const status = getCouponStatus(coupon);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <AdminTableEditLink href={`/admin/coupons/${coupon.id}/edit`} appearance="filled">
        Edit
      </AdminTableEditLink>
      {dialog}
      <AdminTableDeleteButton onClick={handleDelete} disabled={isPending}>
        Hapus
      </AdminTableDeleteButton>
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className={cn(
          "h-6 rounded-md px-2 text-[10px] font-semibold uppercase transition-colors disabled:opacity-50",
          status.className,
        )}
      >
        {status.label}
      </button>
    </div>
  );
}

interface CouponTableProps {
  coupons: CouponRow[];
}

export function CouponTable({ coupons }: CouponTableProps) {
  if (coupons.length === 0) {
    return (
      <div className="admin-utility-card flex flex-col items-center gap-3 border-dashed py-20 text-muted-foreground">
        <Ticket size={36} strokeWidth={1} />
        <p className="text-sm font-semibold uppercase">Belum ada kupon</p>
      </div>
    );
  }

  return (
    <div className="admin-utility-card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e0e0e0] bg-muted/30">
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-foreground uppercase">
                Kode
              </th>
              <th className="hidden px-4 py-3 text-left text-[10px] font-semibold text-foreground uppercase sm:table-cell">
                Diskon
              </th>
              <th className="hidden px-4 py-3 text-left text-[10px] font-semibold text-foreground uppercase md:table-cell">
                Min. Belanja
              </th>
              <th className="hidden px-4 py-3 text-left text-[10px] font-semibold text-foreground uppercase lg:table-cell">
                Pemakaian
              </th>
              <th className="hidden px-4 py-3 text-left text-[10px] font-semibold text-foreground uppercase lg:table-cell">
                Berlaku
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-foreground uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-foreground uppercase">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e0e0e0]">
            {coupons.map((coupon) => {
              const status = getCouponStatus(coupon);
              const discountLabel =
                coupon.type === "percentage"
                  ? `${coupon.value}%${coupon.max_discount ? ` (maks ${formatRupiah(coupon.max_discount)})` : ""}`
                  : formatRupiah(coupon.value);

              return (
                <tr key={coupon.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm font-semibold">{coupon.code}</span>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="text-xs font-medium">{discountLabel}</span>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <span className="text-xs text-foreground">
                      {coupon.min_purchase > 0 ? formatRupiah(coupon.min_purchase) : "—"}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    <span className="text-xs text-foreground">
                      {coupon.used_count}
                      {coupon.max_usage !== null ? ` / ${coupon.max_usage}` : " / ∞"}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    <span className="text-xs text-foreground">
                      {coupon.valid_from || coupon.valid_until
                        ? `${coupon.valid_from ? formatDate(coupon.valid_from) : "—"} → ${coupon.valid_until ? formatDate(coupon.valid_until) : "—"}`
                        : "Tidak terbatas"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase",
                        status.className,
                      )}
                    >
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <CouponActions coupon={coupon} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
