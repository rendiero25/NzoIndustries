import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

import { getServerEnv } from "@/lib/env";
import { normalizeMayarPaymentMethod } from "@/lib/payments/mayar-method";
import type { PaymentProvider, PaymentResult } from "@/lib/payments/provider";

/**
 * Mayar Headless API V2 (Payment Request).
 * Docs: https://docs.mayar.id/api-reference-v2/introduction
 * Sandbox (web.mayar.club → api.mayar.club) dan produksi (api.mayar.id)
 * adalah akun terpisah; key sandbox hanya berlaku di api.mayar.club.
 */
export type MayarResult<T> = PaymentResult<T> & { status?: number };

export type MayarCreatedPayment = {
  id: string;
  transactionId: string | null;
  link: string;
  expiredAt: string | null;
};

export type MayarPaymentDetail = {
  id: string;
  amount: number;
  status: string;
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

type Envelope<T> = { statusCode?: number; messages?: string; data?: T };

function config(): { baseUrl: string; apiKey: string } | null {
  const env = getServerEnv();
  if (!env.MAYAR_API_KEY) return null;
  return {
    baseUrl:
      env.MAYAR_IS_PRODUCTION === "true"
        ? "https://api.mayar.id/hl/v2"
        : "https://api.mayar.club/hl/v2",
    apiKey: env.MAYAR_API_KEY,
  };
}

async function request<T>(
  path: string,
  init: { method: "GET" | "POST"; body?: Record<string, unknown> },
): Promise<MayarResult<T>> {
  const cfg = config();
  if (!cfg) return { ok: false, error: "Mayar belum dikonfigurasi." };
  try {
    const res = await fetch(`${cfg.baseUrl}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });
    let json: Envelope<T> | null = null;
    try {
      json = (await res.json()) as Envelope<T>;
    } catch {
      json = null;
    }
    if (!res.ok || (json?.statusCode != null && json.statusCode !== 200)) {
      // Tanpa body request: berisi data pelanggan (security rule 13).
      console.error("[mayar]", path.split("/")[1], res.status, json?.messages ?? "");
      return {
        ok: false,
        error: json?.messages ?? `Mayar error ${res.status}`,
        status: res.status,
      };
    }
    return { ok: true, data: (json?.data ?? null) as T };
  } catch {
    console.error("[mayar] network error", path.split("/")[1]);
    return { ok: false, error: "Jaringan ke Mayar gagal." };
  }
}

function toIsoOrNull(value: string | number | null | undefined): string | null {
  if (value == null) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
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
  const res = await request<{
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
  if (!res.data?.id || !res.data.link) return { ok: false, error: "Respons Mayar tidak lengkap." };
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
  const res = await request<{
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
  const res = await request<{
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

/** Tutup payment request yang belum dibayar supaya link tidak bisa dipakai lagi. */
export async function closeMayarPayment(paymentId: string): Promise<MayarResult<null>> {
  return request<null>(`/payments/${encodeURIComponent(paymentId)}/close`, { method: "POST" });
}

/** Header `x-callback-token` dibanding lewat digest SHA-256 (panjang selalu sama). */
export function verifyMayarCallbackToken(headers: Headers): boolean {
  const expected = getServerEnv().MAYAR_WEBHOOK_TOKEN;
  const received = headers.get("x-callback-token")?.trim();
  if (!expected || !received) return false;
  const a = createHash("sha256").update(received).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export const mayarProvider: PaymentProvider = {
  name: "mayar",

  async createPayment(input) {
    const res = await createMayarPayment({
      customerName: input.customer.name,
      email: input.customer.email,
      mobile: input.customer.phone,
      amount: input.amount,
      description: input.description,
      redirectUrl: input.returnUrl,
      expiredAt: input.expiresAt,
      extraData: { orderNumber: input.orderNumber },
    });
    if (!res.ok) return { ok: false, error: "Link pembayaran gagal dibuat. Coba lagi." };
    return {
      ok: true,
      data: { ref: res.data.id, checkoutUrl: res.data.link, expiresAt: res.data.expiredAt },
    };
  },

  async getStatus(ref) {
    const detail = await getMayarPayment(ref);
    if (!detail.ok) return { ok: false, error: detail.error };
    const status =
      detail.data.status === "paid"
        ? "paid"
        : detail.data.status === "closed"
          ? "closed"
          : "unpaid";
    let method: string | null = null;
    const transactionRef = detail.data.transactionIds[0] ?? null;
    if (status === "paid" && transactionRef) {
      const tx = await getMayarTransaction(transactionRef);
      if (tx.ok) method = normalizeMayarPaymentMethod(tx.data.paymentMethod);
    }
    return { ok: true, data: { status, amount: detail.data.amount, method, transactionRef } };
  },

  verifyWebhook: verifyMayarCallbackToken,

  async close(ref) {
    await closeMayarPayment(ref);
  },
};
