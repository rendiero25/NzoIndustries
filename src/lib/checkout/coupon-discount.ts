import type { Database } from "@/types/supabase";

type CouponRow = Pick<
  Database["public"]["Tables"]["coupons"]["Row"],
  | "id"
  | "code"
  | "type"
  | "value"
  | "min_purchase"
  | "max_discount"
  | "valid_from"
  | "valid_until"
  | "used_count"
  | "max_usage"
  | "is_active"
> & {
  applies_to?: string | null;
  applies_to_ids?: string[] | null;
};

export type LineForCoupon = {
  productId: string;
  categoryId: string | null;
  brandId: string | null;
  unitPrice: number;
  qty: number;
};

export type CouponValidationOk = {
  couponId: string;
  code: string;
  discountAmount: number;
  eligibleSubtotal: number;
};

function computeEligibleSubtotal(coupon: CouponRow, lines: LineForCoupon[]): number {
  const appliesTo = coupon.applies_to ?? "all";
  const ids = coupon.applies_to_ids ?? [];

  if (appliesTo === "all" || ids.length === 0) {
    return lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  }

  const eligible = lines.filter((l) => {
    if (appliesTo === "product") return ids.includes(l.productId);
    if (appliesTo === "category") return l.categoryId != null && ids.includes(l.categoryId);
    if (appliesTo === "brand") return l.brandId != null && ids.includes(l.brandId);
    return true;
  });

  return eligible.reduce((s, l) => s + l.unitPrice * l.qty, 0);
}

export function computeCouponDiscount(
  subtotal: number,
  coupon: CouponRow,
  lines?: LineForCoupon[],
): { ok: true; data: CouponValidationOk } | { ok: false; error: string } {
  if (!coupon.is_active) {
    return { ok: false, error: "Kupon tidak aktif." };
  }
  const now = new Date();
  if (coupon.valid_from && new Date(coupon.valid_from) > now) {
    return { ok: false, error: "Kupon belum berlaku." };
  }
  if (coupon.valid_until && new Date(coupon.valid_until) < now) {
    return { ok: false, error: "Kupon sudah kedaluwarsa." };
  }
  if (subtotal < Number(coupon.min_purchase)) {
    return {
      ok: false,
      error: `Minimal belanja ${Number(coupon.min_purchase).toLocaleString("id-ID")} untuk kupon ini.`,
    };
  }
  if (coupon.max_usage != null && coupon.used_count >= coupon.max_usage) {
    return { ok: false, error: "Kuota kupon habis." };
  }

  const eligibleSubtotal =
    lines && lines.length > 0 ? computeEligibleSubtotal(coupon, lines) : subtotal;

  if (eligibleSubtotal <= 0) {
    const scope = coupon.applies_to;
    const msg =
      scope === "product"
        ? "produk yang memenuhi syarat kupon ini"
        : scope === "category"
          ? "kategori yang memenuhi syarat kupon ini"
          : scope === "brand"
            ? "merek yang memenuhi syarat kupon ini"
            : "produk yang memenuhi syarat";
    return { ok: false, error: `Tidak ada ${msg} di keranjang Anda.` };
  }

  let discount = 0;
  if (coupon.type === "percentage") {
    discount = Math.floor((eligibleSubtotal * Number(coupon.value)) / 100);
    if (coupon.max_discount != null) {
      discount = Math.min(discount, Number(coupon.max_discount));
    }
  } else {
    discount = Math.min(Math.floor(Number(coupon.value)), Math.floor(eligibleSubtotal));
  }

  if (discount <= 0) {
    return { ok: false, error: "Nilai diskon tidak valid." };
  }

  return {
    ok: true,
    data: { couponId: coupon.id, code: coupon.code, discountAmount: discount, eligibleSubtotal },
  };
}
