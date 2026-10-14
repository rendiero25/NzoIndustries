import { createHash } from "node:crypto";

import { getServerEnv } from "@/lib/env";
import { safeEqual } from "@/lib/security/secret";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/biteship?token=<BITESHIP_WEBHOOK_SECRET>
 *
 * Update status pengiriman dari Biteship (payload flat: order_id, status,
 * courier_waybill_id, updated_at). Biteship tidak menandatangani payload,
 * jadi rahasia di query string wajib (rule 5). Idempoten lewat `webhook_events`
 * (hash payload); status diterapkan RPC `system_apply_shipment_update`.
 */
type BiteshipWebhookBody = {
  order_id?: string;
  status?: string;
  updated_at?: string;
  courier_waybill_id?: string;
  courier?: { waybill_id?: string };
};

export async function POST(req: Request) {
  const raw = await req.text();
  let body: BiteshipWebhookBody;
  try {
    body = raw ? (JSON.parse(raw) as BiteshipWebhookBody) : {};
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  // Ping instalasi dari dashboard Biteship: body kosong, harus dijawab 200.
  if (!body.order_id || !body.status) return Response.json({ ok: true });

  const secret = getServerEnv().BITESHIP_WEBHOOK_SECRET;
  if (!safeEqual(new URL(req.url).searchParams.get("token"), secret)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const svc = createAdminClient();
  const payloadHash = createHash("sha256").update(raw).digest("hex");
  const eventId = `${body.order_id}:${body.status}:${body.updated_at ?? payloadHash.slice(0, 16)}`;
  const { error: dupError } = await svc.from("webhook_events").insert({
    provider: "biteship",
    event_id: eventId,
    event_type: body.status,
    payload_hash: payloadHash,
  });
  if (dupError) {
    // 23505 = sudah pernah diproses (kiriman ulang Biteship).
    if (dupError.code === "23505") return Response.json({ ok: true, duplicate: true });
    console.error("[webhook biteship] event", dupError.code);
    return Response.json({ ok: false }, { status: 500 });
  }

  const at =
    body.updated_at && !Number.isNaN(Date.parse(body.updated_at))
      ? body.updated_at
      : new Date().toISOString();
  const { data, error } = await svc.rpc("system_apply_shipment_update", {
    p_biteship_order_id: body.order_id,
    p_status: body.status,
    p_waybill: body.courier_waybill_id ?? body.courier?.waybill_id ?? undefined,
    p_at: at,
  });
  await svc
    .from("webhook_events")
    .update({ processed_at: new Date().toISOString(), error: error ? error.code : null })
    .eq("provider", "biteship")
    .eq("event_id", eventId);
  if (error) {
    console.error("[webhook biteship] apply", error.code);
    return Response.json({ ok: false }, { status: 500 });
  }
  return Response.json({ ok: true, result: data });
}
