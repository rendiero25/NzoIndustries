import "server-only";

/**
 * Mayar Headless API V2 client (Payment Request).
 * Docs: https://docs.mayar.id/api-reference-v2/introduction
 *
 * Sandbox and production are separate accounts — a sandbox key (web.mayar.club)
 * only works against api.mayar.club, a production key only against api.mayar.id.
 */

export type MayarResult<T> = { ok: true; data: T } | { ok: false; error: string; status?: number };

export type MayarPaymentStatus = "unpaid" | "paid" | "closed";

export type MayarCreatedPayment = {
  id: string;
  transactionId: string | null;
  link: string;
  expiredAt: string | null;
};

export type MayarPaymentDetail = {
  id: string;
  amount: number;
  status: MayarPaymentStatus | string;
  transactionIds: string[];
  link: string | null;
};

export type MayarTransactionDetail = {
  id: string;
  amount: number;
  status: string;
  paymentMethod: string | null;
  paymentLinkId: string | null;
};

type MayarEnvelope<T> = { statusCode?: number; messages?: string; data?: T };

function mayarConfig(): { baseUrl: string; apiKey: string } | null {
  const apiKey = process.env.MAYAR_API_KEY?.trim();
  if (!apiKey) return null;
  const isProduction = process.env.MAYAR_IS_PRODUCTION === "true";
  return {
    baseUrl: isProduction ? "https://api.mayar.id/hl/v2" : "https://api.mayar.club/hl/v2",
    apiKey,
  };
}

async function mayarRequest<T>(
  path: string,
  init: { method: "GET" | "POST"; body?: Record<string, unknown> },
): Promise<MayarResult<T>> {
  const config = mayarConfig();
  if (!config) return { ok: false, error: "MAYAR_API_KEY tidak dikonfigurasi." };

  try {
    const res = await fetch(`${config.baseUrl}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });

    let json: MayarEnvelope<T> | null = null;
    try {
      json = (await res.json()) as MayarEnvelope<T>;
    } catch {
      json = null;
    }

    if (!res.ok || (json?.statusCode != null && json.statusCode !== 200)) {
      const error = json?.messages ?? `Mayar error ${res.status}`;
      console.error("[Mayar] request failed", { path, status: res.status, error });
      return { ok: false, error, status: res.status };
    }

    return { ok: true, data: (json?.data ?? null) as T };
  } catch (err) {
    console.error("[Mayar] network error", { path, err });
    return { ok: false, error: "Jaringan ke Mayar gagal." };
  }
}

export async function createMayarPayment(params: {
  customerName: string;
  email: string;
  mobile: string;
  amount: number;
  description: string;
  redirectUrl: string | null;
  expiredAt: Date;
  extraData: Record<string, string>;
}): Promise<MayarResult<MayarCreatedPayment>> {
  const res = await mayarRequest<{
    id?: string;
    transactionId?: string;
    link?: string;
    expiredAt?: string | number | null;
  }>("/payments/create", {
    method: "POST",
    body: {
      name: params.customerName,
      email: params.email,
      mobile: params.mobile,
      amount: params.amount,
      description: params.description,
      expiredAt: params.expiredAt.toISOString(),
      extraData: params.extraData,
      ...(params.redirectUrl ? { redirectUrl: params.redirectUrl } : {}),
    },
  });
  if (!res.ok) return res;
  if (!res.data?.id || !res.data.link) {
    return { ok: false, error: "Respons Mayar tidak lengkap." };
  }
  return {
    ok: true,
    data: {
      id: res.data.id,
      transactionId: res.data.transactionId ?? null,
      link: res.data.link,
      expiredAt: toIsoOrNull(res.data.expiredAt),
    },
  };
}

export async function getMayarPayment(paymentId: string): Promise<MayarResult<MayarPaymentDetail>> {
  const res = await mayarRequest<{
    id?: string;
    amount?: number;
    status?: string;
    transactions?: { id?: string }[];
    linkPayment?: string;
  }>(`/payments/${encodeURIComponent(paymentId)}`, { method: "GET" });
  if (!res.ok) return res;
  if (!res.data?.id) return { ok: false, error: "Payment request Mayar tidak ditemukan." };
  return {
    ok: true,
    data: {
      id: res.data.id,
      amount: Number(res.data.amount ?? 0),
      status: res.data.status ?? "unpaid",
      transactionIds: (res.data.transactions ?? [])
        .map((t) => t.id)
        .filter((id): id is string => !!id),
      link: res.data.linkPayment ?? null,
    },
  };
}

export async function getMayarTransaction(
  transactionId: string,
): Promise<MayarResult<MayarTransactionDetail>> {
  const res = await mayarRequest<{
    id?: string;
    amount?: number;
    status?: string;
    paymentMethod?: string | null;
    paymentLinkId?: string | null;
  }>(`/transactions/${encodeURIComponent(transactionId)}`, { method: "GET" });
  if (!res.ok) return res;
  if (!res.data?.id) return { ok: false, error: "Transaksi Mayar tidak ditemukan." };
  return {
    ok: true,
    data: {
      id: res.data.id,
      amount: Number(res.data.amount ?? 0),
      status: res.data.status ?? "",
      paymentMethod: res.data.paymentMethod ?? null,
      paymentLinkId: res.data.paymentLinkId ?? null,
    },
  };
}

/** Closes an unpaid payment request so the link can no longer be paid. */
export async function closeMayarPayment(paymentId: string): Promise<MayarResult<null>> {
  return mayarRequest<null>(`/payments/${encodeURIComponent(paymentId)}/close`, { method: "POST" });
}

function toIsoOrNull(value: string | number | null | undefined): string | null {
  if (value == null) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const WALLETS = ["gopay", "shopeepay", "dana", "linkaja", "ovo", "jenius"] as const;
const OUTLETS = ["alfamart", "indomaret"] as const;
const VA_BANKS = ["bca", "bni", "bri", "mandiri", "permata", "cimb", "bsi", "bjb"] as const;

/**
 * Maps Mayar's free-form paymentMethod ("QRIS", "va/bni", "ewallet/gopay", ...)
 * onto the keys used by PAYMENT_METHOD_LABELS / PAYMENT_METHOD_LOGOS.
 */
export function normalizeMayarPaymentMethod(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const tokens = raw
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  if (tokens.length === 0) return null;
  if (tokens.includes("qris")) return "qris";
  for (const w of WALLETS) if (tokens.includes(w)) return w;
  for (const o of OUTLETS) if (tokens.includes(o)) return o;
  for (const b of VA_BANKS) if (tokens.includes(b)) return `${b}_va`;
  if (tokens.includes("credit") || tokens.includes("card") || tokens.includes("cc"))
    return "credit_card";
  return tokens.join("_");
}
