"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/guards";
import { verifyTurnstile } from "@/lib/auth/turnstile";
import { getServerEnv } from "@/lib/env";
import { startPayment } from "@/lib/payments/start";
import { checkRateLimit } from "@/lib/security/rate-limit";
import {
  getShippingProvider,
  SHIPPING_NOT_CONFIGURED,
  type ShippingParcelItem,
  type ShippingRate,
} from "@/lib/shipping/provider";
import { chargeableUnitGrams } from "@/lib/shipping/weight";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  placeOrderSchema,
  voucherCodeSchema,
  type PlaceOrderInput,
} from "@/lib/validations/checkout";
import {
  priceCartLines,
  readUserCart,
  toCartLine,
  toRpcItems,
  type CartLine,
  type CartLineRow,
} from "@/server/queries/cart";
import { ADDRESS_COLUMNS, toSavedAddress, type SavedAddress } from "@/server/queries/checkout";

/**
 * Checkout (D-29). Semua angka dihitung server dari database:
 * keranjang dibaca dari tabel `carts`, ongkir diambil ulang dari provider,
 * total & stok final di RPC `place_order` (service role, satu transaksi).
 */

type UserClient = Awaited<ReturnType<typeof createClient>>;

async function loadAddress(
  supabase: UserClient,
  userId: string,
  addressId: string,
): Promise<SavedAddress | null> {
  const { data } = await supabase
    .from("addresses")
    .select(ADDRESS_COLUMNS)
    .eq("id", addressId)
    .eq("user_id", userId)
    .maybeSingle();
  return data ? toSavedAddress(data) : null;
}

function parcelItems(lines: CartLine[]): ShippingParcelItem[] {
  const defaultGrams = getServerEnv().DEFAULT_ITEM_WEIGHT_GRAMS;
  return lines.map((l) => ({
    name: l.variantName ? `${l.name} - ${l.variantName}` : (l.name ?? "Produk"),
    value: l.unitPrice,
    quantity: l.quantity,
    weightGrams: chargeableUnitGrams(l, defaultGrams),
  }));
}

async function fetchRates(
  address: SavedAddress,
  lines: CartLine[],
): Promise<{ ok: true; rates: ShippingRate[] } | { ok: false; error: string }> {
  const provider = getShippingProvider();
  if (!provider) return { ok: false, error: SHIPPING_NOT_CONFIGURED };
  const result = await provider.getRates(
    { areaId: address.areaId, postalCode: address.postalCode, latitude: null, longitude: null },
    parcelItems(lines),
  );
  return result.ok ? { ok: true, rates: result.data } : result;
}

async function loadCartLines(supabase: UserClient, userId: string) {
  const { items } = await readUserCart(supabase, userId);
  const lines = await priceCartLines(items);
  return { items, lines };
}

const CART_CHANGED = "Isi keranjang berubah. Periksa keranjang kamu dulu.";

// ------------------------------------------------------------

export type ShippingOptionsResult =
  { ok: true; rates: ShippingRate[] } | { ok: false; error: string };

export async function getShippingOptions(input: {
  addressId: string;
}): Promise<ShippingOptionsResult> {
  const parsed = z.object({ addressId: z.uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pilih alamat pengiriman." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Masuk dulu." };
  if (!(await checkRateLimit("shippingRates", user.id))) {
    return { ok: false, error: "Terlalu sering. Coba lagi sebentar lagi." };
  }

  const supabase = await createClient();
  const [address, { lines }] = await Promise.all([
    loadAddress(supabase, user.id, parsed.data.addressId),
    loadCartLines(supabase, user.id),
  ]);
  if (!address) return { ok: false, error: "Alamat tidak ditemukan." };
  if (lines.length === 0) return { ok: false, error: "Keranjang kosong." };
  if (lines.some((l) => l.status !== "ok")) return { ok: false, error: CART_CHANGED };

  const result = await fetchRates(address, lines);
  return result.ok ? { ok: true, rates: result.rates } : result;
}

export type CheckoutQuote = {
  lines: CartLine[];
  allOk: boolean;
  subtotal: number;
  flashSavings: number;
  discount: number;
  voucherApplied: boolean;
  voucherMessage: string | null;
};

export type QuoteResult = { ok: true; quote: CheckoutQuote } | { ok: false; error: string };

/** Ringkasan harga terkini + validasi voucher (tanpa ongkir; ongkir dari pilihan tarif). */
export async function previewCheckout(input: { voucherCode?: string }): Promise<QuoteResult> {
  const parsed = z.object({ voucherCode: voucherCodeSchema.optional() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Kode voucher tidak valid." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Masuk dulu." };
  const code = parsed.data.voucherCode || null;
  if (code && !(await checkRateLimit("voucher", user.id))) {
    return { ok: false, error: "Terlalu sering mencoba voucher. Coba lagi sebentar lagi." };
  }

  const supabase = await createClient();
  const { items } = await readUserCart(supabase, user.id);
  if (items.length === 0) return { ok: false, error: "Keranjang kosong." };

  const { data, error } = await createAdminClient().rpc("checkout_quote", {
    p_user: user.id,
    p_items: toRpcItems(items),
    p_voucher_code: code ?? undefined,
  });
  if (error || !data) return { ok: false, error: "Ringkasan gagal dimuat. Coba lagi." };

  const q = data as {
    lines: CartLineRow[];
    all_ok: boolean;
    subtotal: number;
    flash_savings: number;
    voucher_id: string | null;
    discount: number;
    voucher_message: string | null;
  };
  return {
    ok: true,
    quote: {
      lines: q.lines.map(toCartLine),
      allOk: q.all_ok,
      subtotal: Number(q.subtotal),
      flashSavings: Number(q.flash_savings),
      discount: Number(q.discount),
      voucherApplied: q.voucher_id !== null,
      voucherMessage: q.voucher_message,
    },
  };
}

export type PlaceOrderResult =
  | { ok: true; orderNumber: string; paymentUrl: string | null; paymentError: string | null }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Masuk dulu untuk membuat pesanan." };
  if (user.isBlocked) return { ok: false, error: "Akun kamu tidak dapat membuat pesanan." };
  if (!(await checkRateLimit("checkout", user.id))) {
    return { ok: false, error: "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi." };
  }

  const parsed = placeOrderSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Lengkapi data checkout.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const v = parsed.data;
  if (!(await verifyTurnstile(v.turnstileToken))) {
    return { ok: false, error: "Verifikasi keamanan gagal. Muat ulang halaman lalu coba lagi." };
  }

  const supabase = await createClient();
  const [address, { items, lines }] = await Promise.all([
    loadAddress(supabase, user.id, v.addressId),
    loadCartLines(supabase, user.id),
  ]);
  if (!address) return { ok: false, error: "Alamat tidak ditemukan." };
  if (items.length === 0) return { ok: false, error: "Keranjang kosong." };
  if (lines.some((l) => l.status !== "ok")) return { ok: false, error: CART_CHANGED };

  // Ongkir diambil ulang di server; pilihan user hanya menentukan layanan.
  const rates = await fetchRates(address, lines);
  if (!rates.ok) return { ok: false, error: rates.error };
  const rate = rates.rates.find((r) => r.id === v.rateId);
  if (!rate) return { ok: false, error: "Layanan kurir berubah. Pilih ulang kurir." };

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("place_order", {
    p_user: user.id,
    p_checkout_key: v.checkoutKey,
    p_items: toRpcItems(items),
    p_address: {
      label: address.label,
      recipient: address.recipient,
      phone: address.phone,
      full_address: address.fullAddress,
      district: address.district,
      city: address.city,
      province: address.province,
      postal_code: address.postalCode,
      area_id: address.areaId,
    },
    p_shipping: {
      courier_code: rate.courierCode,
      courier_service: rate.serviceCode,
      courier_name: rate.courierName,
      service_name: rate.serviceName,
      cost: rate.price,
      is_test: rate.isTest,
    },
    p_voucher_code: v.voucherCode ?? "",
    p_payment_provider: v.paymentProvider,
    p_note: v.note || undefined,
  });

  if (error || !data) {
    // Klik ganda bersamaan: pesanan pertama sudah dibuat dengan key yang sama.
    const { data: existing } = await admin
      .from("orders")
      .select("order_number")
      .eq("checkout_key", v.checkoutKey)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing) {
      return { ok: true, orderNumber: existing.order_number, paymentUrl: null, paymentError: null };
    }
    const message =
      error?.code === "P0001" && error.message ? error.message : "Pesanan gagal dibuat. Coba lagi.";
    return { ok: false, error: message };
  }

  const result = data as { order_id: string; order_number: string };
  revalidatePath("/cart");

  // Link bayar Mayar (D-31). Gagal di sini tidak membatalkan pesanan:
  // halaman status menyediakan "Bayar sekarang" untuk mencoba lagi.
  const payment = await startPayment(result.order_id, { id: user.id, email: user.email });
  return {
    ok: true,
    orderNumber: result.order_number,
    paymentUrl: payment.ok ? payment.checkoutUrl : null,
    paymentError: payment.ok ? null : payment.error,
  };
}
