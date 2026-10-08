import "server-only";

import { getClientEnv } from "@/lib/env.client";
import { getPaymentProvider, PAYMENT_NOT_CONFIGURED } from "@/lib/payments/provider";
import { createAdminClient } from "@/lib/supabase/admin";

export type StartPaymentResult = { ok: true; checkoutUrl: string } | { ok: false; error: string };

/**
 * Link bayar untuk pesanan `pending_payment` milik user. Memakai ulang link
 * pending yang masih berlaku; selain itu membuat payment request baru yang
 * kedaluwarsa bersamaan dengan batas bayar pesanan.
 */
export async function startPayment(
  orderId: string,
  user: { id: string; email: string | null },
): Promise<StartPaymentResult> {
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, user_id, order_number, status, grand_total, payment_due_at, shipping_address")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.user_id !== user.id) return { ok: false, error: "Pesanan tidak ditemukan." };
  if (order.status !== "pending_payment") {
    return { ok: false, error: "Pesanan ini tidak menunggu pembayaran." };
  }
  const due = order.payment_due_at ? new Date(order.payment_due_at) : null;
  if (!due || due.getTime() <= Date.now()) {
    return { ok: false, error: "Batas waktu pembayaran sudah lewat." };
  }

  const { data: pending } = await admin
    .from("payments")
    .select("id, checkout_url, expires_at")
    .eq("order_id", order.id)
    .eq("status", "pending")
    .maybeSingle();
  if (pending?.checkout_url && (!pending.expires_at || new Date(pending.expires_at) > new Date())) {
    return { ok: true, checkoutUrl: pending.checkout_url };
  }
  if (pending) {
    await admin.from("payments").update({ status: "expired" }).eq("id", pending.id);
  }

  const provider = getPaymentProvider();
  if (!provider) return { ok: false, error: PAYMENT_NOT_CONFIGURED };

  const address = (order.shipping_address ?? {}) as { recipient?: string; phone?: string };
  const amount = Number(order.grand_total);
  const created = await provider.createPayment({
    orderNumber: order.order_number,
    amount,
    description: `Pesanan ${order.order_number} - NZO Industries`,
    customer: {
      name: address.recipient ?? "Pelanggan NZO",
      email: user.email ?? "",
      phone: address.phone ?? "",
    },
    expiresAt: due,
    returnUrl: `${getClientEnv().NEXT_PUBLIC_APP_URL}/checkout/success?order=${encodeURIComponent(order.order_number)}`,
  });
  if (!created.ok) return { ok: false, error: created.error };

  const { error } = await admin.from("payments").insert({
    order_id: order.id,
    provider: "mayar",
    provider_ref: created.data.ref,
    status: "pending",
    amount,
    checkout_url: created.data.checkoutUrl,
    expires_at: created.data.expiresAt ?? due.toISOString(),
  });
  if (error) {
    // Dua request bersamaan: pakai link yang lebih dulu tersimpan.
    const { data: winner } = await admin
      .from("payments")
      .select("checkout_url")
      .eq("order_id", order.id)
      .eq("status", "pending")
      .maybeSingle();
    if (winner?.checkout_url) {
      await provider.close(created.data.ref);
      return { ok: true, checkoutUrl: winner.checkout_url };
    }
    return { ok: false, error: "Link pembayaran gagal disimpan. Coba lagi." };
  }
  return { ok: true, checkoutUrl: created.data.checkoutUrl };
}
