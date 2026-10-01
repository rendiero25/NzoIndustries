import { z } from "zod";

import { createClient } from "@/lib/supabase/legacy/server";
import { computeCouponDiscount } from "@/lib/checkout/coupon-discount";

const lineSchema = z.object({
  productId: z.string(),
  categoryId: z.string().nullable(),
  brandId: z.string().nullable(),
  unitPrice: z.number().nonnegative(),
  qty: z.number().int().positive(),
});

const bodySchema = z.object({
  code: z.string().min(1).max(64),
  subtotal: z.number().nonnegative(),
  lines: z.array(lineSchema).optional(),
});

export async function POST(req: Request) {
  try {
    const json: unknown = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return Response.json({ success: false, error: "Permintaan tidak valid." }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json(
        { success: false, error: "Silakan masuk terlebih dahulu." },
        { status: 401 },
      );
    }

    const code = parsed.data.code.trim().toUpperCase();
    const { data: coupon, error } = await supabase
      .from("coupons")
      .select(
        "id, code, type, value, min_purchase, max_discount, valid_from, valid_until, used_count, max_usage, is_active, applies_to, applies_to_ids",
      )
      .ilike("code", code)
      .maybeSingle();

    if (error || !coupon) {
      return Response.json({ success: false, error: "Kode kupon tidak dikenal." }, { status: 404 });
    }

    const { data: usage } = await supabase
      .from("coupon_usages")
      .select("id")
      .eq("coupon_id", coupon.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (usage) {
      return Response.json(
        { success: false, error: "Anda sudah pernah menggunakan kupon ini." },
        { status: 400 },
      );
    }

    const result = computeCouponDiscount(parsed.data.subtotal, coupon, parsed.data.lines);
    if (!result.ok) {
      return Response.json({ success: false, error: result.error }, { status: 400 });
    }

    return Response.json({ success: true, data: result.data });
  } catch {
    return Response.json({ success: false, error: "Terjadi kesalahan server." }, { status: 500 });
  }
}
