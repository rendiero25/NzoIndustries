import { createHash } from "node:crypto";

import { verifyMayarCallbackToken } from "@/lib/payments/mayar";
import { parseMayarWebhook } from "@/lib/payments/mayar-webhook";
import { settlePayment } from "@/lib/payments/settle";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/mayar (daftarkan di dashboard Mayar; header x-callback-token).
 * Mayar mengulang hingga 5× bila respons bukan 2xx.
 *
 * Alur: token → parse → idempotency `webhook_events` → cari payment →
 * settlePayment (status & nominal ditanyakan ulang ke API Mayar, D-31).
 */
export async function POST(req: Request) {
  if (!verifyMayarCallbackToken(req.headers)) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const raw = await req.text();
  if (raw.length > 64_000) {
    return Response.json({ success: false, error: "Payload terlalu besar." }, { status: 413 });
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return Response.json({ success: false, error: "Payload tidak valid." }, { status: 400 });
  }
  const hook = parseMayarWebhook(json);
  if (!hook) {
    return Response.json({ success: false, error: "Payload tidak valid." }, { status: 400 });
  }
  if (hook.event !== "payment.received") {
    return Response.json({ success: true, ignored: hook.event });
  }

  const admin = createAdminClient();
  const payloadHash = createHash("sha256").update(raw).digest("hex");
  const eventId = hook.eventId ?? `hash:${payloadHash}`;

  const { data: existing } = await admin
    .from("webhook_events")
    .select("id, processed_at")
    .eq("provider", "mayar")
    .eq("event_id", eventId)
    .maybeSingle();
  if (existing?.processed_at) return Response.json({ success: true, duplicate: true });

  let eventRowId = existing?.id ?? null;
  if (!eventRowId) {
    const { data: inserted } = await admin
      .from("webhook_events")
      .insert({
        provider: "mayar",
        event_id: eventId,
        event_type: hook.event,
        payload_hash: payloadHash,
      })
      .select("id")
      .maybeSingle();
    eventRowId = inserted?.id ?? null;
  }

  const finish = async (error: string | null) => {
    if (eventRowId === null) return;
    await admin
      .from("webhook_events")
      .update(error ? { error } : { processed_at: new Date().toISOString(), error: null })
      .eq("id", eventRowId);
  };

  // Cari payment: id payment request / transaksi, lalu nomor pesanan di extraData.
  let paymentId: string | null = null;
  if (hook.refs.length) {
    const { data } = await admin
      .from("payments")
      .select("id")
      .or(`provider_ref.in.(${hook.refs.join(",")}),transaction_ref.in.(${hook.refs.join(",")})`)
      .order("created_at", { ascending: false })
      .limit(1);
    paymentId = data?.[0]?.id ?? null;
  }
  if (!paymentId && hook.orderNumber) {
    const { data: order } = await admin
      .from("orders")
      .select("id")
      .eq("order_number", hook.orderNumber)
      .maybeSingle();
    if (order) {
      const { data } = await admin
        .from("payments")
        .select("id")
        .eq("order_id", order.id)
        .in("status", ["pending", "expired", "paid"])
        .order("created_at", { ascending: false })
        .limit(1);
      paymentId = data?.[0]?.id ?? null;
    }
  }
  if (!paymentId) {
    // Bukan milik toko ini (produk Mayar lain): akui agar Mayar berhenti mengulang.
    await finish(null);
    return Response.json({ success: true, matched: false });
  }

  const outcome = await settlePayment(paymentId);
  if (outcome === "error" || outcome === "unpaid") {
    await finish(outcome === "error" ? "provider_error" : "not_paid_yet");
    return Response.json({ success: false, retry: true }, { status: 502 });
  }
  await finish(null);
  return Response.json({ success: true, outcome });
}
