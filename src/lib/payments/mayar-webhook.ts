import { z } from "zod";

/**
 * Parse payload webhook Mayar. Payload hanya dipakai untuk MENEMUKAN
 * pembayaran; status & nominal selalu ditanyakan ulang ke API Mayar.
 */
const payloadSchema = z.object({
  event: z.string().max(100),
  data: z.record(z.string(), z.unknown()).nullish(),
});

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const ORDER_NUMBER = /^NZO-\d{6}-[0-9A-F]{6}$/;
const REF_KEYS = ["id", "transactionId", "paymentLinkId", "paymentId", "invoiceId", "productId"];

export type ParsedMayarWebhook = {
  event: string;
  /** id event untuk idempotency (`webhook_events`). null = pakai hash body. */
  eventId: string | null;
  refs: string[];
  orderNumber: string | null;
};

function orderNumberFrom(data: Record<string, unknown>): string | null {
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
    return typeof v === "string" && ORDER_NUMBER.test(v) ? v : null;
  }
  return null;
}

export function parseMayarWebhook(json: unknown): ParsedMayarWebhook | null {
  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) return null;
  const data = parsed.data.data ?? {};
  const refs = [
    ...new Set(
      REF_KEYS.map((k) => data[k]).filter(
        (v): v is string => typeof v === "string" && ID_PATTERN.test(v),
      ),
    ),
  ];
  const id = typeof data.id === "string" && ID_PATTERN.test(data.id) ? data.id : null;
  return {
    event: parsed.data.event,
    eventId: id ? `${parsed.data.event}:${id}` : null,
    refs,
    orderNumber: orderNumberFrom(data),
  };
}
