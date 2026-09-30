import { z } from "zod";

import { createServiceClient } from "@/lib/supabase/server";
import { verifyMayarWebhookToken } from "@/lib/mayar/verify-webhook";
import { reconcileMayarPayment } from "@/lib/payments/reconcile-mayar";
import type { Json } from "@/types/supabase";

/**
 * POST /api/webhooks/mayar
 *
 * Register this URL in the Mayar dashboard (sandbox: web.mayar.club, production:
 * web.mayar.id). Mayar retries up to 5x on non-2xx responses.
 *
 * The payload is only used to locate the order — payment status and amount are
 * always re-read from the Mayar API before the order is settled.
 */

const payloadSchema = z.object({
  event: z.string(),
  data: z.record(z.string(), z.unknown()).optional().nullable(),
});

const ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;

function stringField(data: Record<string, unknown>, key: string): string | null {
  const v = data[key];
  return typeof v === "string" && ID_PATTERN.test(v) ? v : null;
}

function orderNumberFromExtraData(data: Record<string, unknown>): string | null {
  let extra: unknown = data.extraData;
  if (typeof extra === "string") {
    try {
      extra = JSON.parse(extra);
    } catch {
      return null;
    }
  }
  if (extra && typeof extra === "object" && "orderNumber" in extra) {
    const v = (extra as { orderNumber?: unknown }).orderNumber;
    return typeof v === "string" && v.length <= 64 ? v : null;
  }
  return null;
}

export async function POST(req: Request) {
  if (!verifyMayarWebhookToken(req.headers)) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json: unknown = await req.json();
    const parsed = payloadSchema.safeParse(json);
    if (!parsed.success) {
      return Response.json({ success: false, error: "Payload tidak valid." }, { status: 400 });
    }

    // Only incoming payments settle orders; reminders and other events are acknowledged.
    if (parsed.data.event !== "payment.received" || !parsed.data.data) {
      return Response.json({ success: true, data: { ignored: parsed.data.event } });
    }

    const data = parsed.data.data;
    const candidateIds = [
      ...new Set(
        ["id", "transactionId", "productId", "paymentLinkId", "paymentId", "invoiceId"]
          .map((k) => stringField(data, k))
          .filter((v): v is string => !!v),
      ),
    ];

    const svc = createServiceClient();
    const paymentColumns = "order_id, mayar_payment_id, mayar_transaction_id, gross_amount";

    let payment: {
      order_id: string;
      mayar_payment_id: string | null;
      mayar_transaction_id: string | null;
      gross_amount: number;
    } | null = null;

    if (candidateIds.length > 0) {
      const list = candidateIds.join(",");
      const { data: rows } = await svc
        .from("payments")
        .select(paymentColumns)
        .or(`mayar_payment_id.in.(${list}),mayar_transaction_id.in.(${list})`)
        .limit(1);
      payment = rows?.[0] ?? null;
    }

    if (!payment) {
      const orderNumber = orderNumberFromExtraData(data);
      if (orderNumber) {
        const { data: order } = await svc
          .from("orders")
          .select("id")
          .eq("order_number", orderNumber)
          .maybeSingle();
        if (order) {
          const { data: row } = await svc
            .from("payments")
            .select(paymentColumns)
            .eq("order_id", order.id)
            .not("mayar_payment_id", "is", null)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          payment = row ?? null;
        }
      }
    }

    if (!payment) {
      // Not ours (e.g. a payment on another Mayar product) — acknowledge so Mayar stops retrying.
      console.warn("[Mayar webhook] payment not matched", { candidateIds });
      return Response.json({ success: true, data: { matched: false } });
    }

    const result = await reconcileMayarPayment(payment, json as Json);
    if (result.status === "error" || result.status === "unpaid") {
      // Non-2xx so Mayar retries: transient API failure, or the payment request
      // not yet reflecting the payment this event reports.
      const error =
        result.status === "error" ? result.error : "Pembayaran belum tercatat di Mayar.";
      return Response.json({ success: false, error }, { status: 502 });
    }

    return Response.json({ success: true, data: result });
  } catch (err) {
    console.error("[Mayar webhook] unexpected error", err);
    return Response.json({ success: false, error: "Terjadi kesalahan server." }, { status: 500 });
  }
}
