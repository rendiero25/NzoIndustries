"use client";

import { MapPin, Pencil, Plus, ShoppingBag, Truck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { TurnstileWidgetLazy } from "@/components/auth/turnstile-widget-lazy";
import { ProductImage } from "@/components/catalog/product-image";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { isTurnstileRequired } from "@/lib/auth/turnstile-config";
import { formatIDR } from "@/lib/money";
import type { ShippingRate } from "@/lib/shipping/provider";
import { cn } from "@/lib/utils";
import { PAYMENT_LABELS, type PaymentProviderId } from "@/lib/validations/checkout";
import { syncCart } from "@/server/actions/cart";
import {
  getShippingOptions,
  placeOrder,
  previewCheckout,
  type CheckoutQuote,
} from "@/server/actions/checkout";
import type { SavedAddress } from "@/server/queries/checkout";
import { useCartStore } from "@/store/cart-store";

import { AddressDialog } from "./address-dialog";
import { lineToCartItem } from "./cart-sync";

type Props = {
  userId: string;
  initialAddresses: SavedAddress[];
  paymentProviders: PaymentProviderId[];
  paymentTimeoutMinutes: number;
};

function Step({
  n,
  title,
  children,
  aside,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={`step-${n}`}
      className="flex flex-col gap-4 rounded-xl border border-border p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id={`step-${n}`} className="flex items-center gap-3 text-base">
          <span className="flex size-7 items-center justify-center rounded-full bg-primary text-caption font-bold text-primary-foreground tabular-nums">
            {n}
          </span>
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function formatTimeout(minutes: number): string {
  if (minutes % 1440 === 0) return `${minutes / 1440} × 24 jam`;
  if (minutes % 60 === 0) return `${minutes / 60} jam`;
  return `${minutes} menit`;
}

/**
 * Checkout satu halaman (design-system §5): alamat → kurir & ongkir → voucher
 * → pembayaran → ringkasan. Angka yang tampil berasal dari server; total
 * final dihitung ulang di RPC `place_order` (D-29).
 */
export function CheckoutForm({
  userId,
  initialAddresses,
  paymentProviders,
  paymentTimeoutMinutes,
}: Props) {
  const router = useRouter();
  const [checkoutKey] = useState(() => crypto.randomUUID());

  const [addresses, setAddresses] = useState(initialAddresses);
  const [addressId, setAddressId] = useState<string | null>(
    initialAddresses.find((a) => a.isDefault)?.id ?? initialAddresses[0]?.id ?? null,
  );
  const [dialog, setDialog] = useState<{ open: boolean; edit: SavedAddress | null }>({
    open: false,
    edit: null,
  });

  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [voucherInput, setVoucherInput] = useState("");
  const [voucherCode, setVoucherCode] = useState<string | undefined>();
  const [voucherPending, startVoucher] = useTransition();

  const [rates, setRates] = useState<{
    addressId: string;
    rates: ShippingRate[];
    error: string | null;
  }>();
  const [rateId, setRateId] = useState<string | null>(null);
  const [ratesNonce, setRatesNonce] = useState(0);

  const [provider, setProvider] = useState<PaymentProviderId | null>(paymentProviders[0] ?? null);
  const [note, setNote] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [placing, startPlacing] = useTransition();

  const loadQuote = useCallback(async (code?: string) => {
    const res = await previewCheckout({ voucherCode: code });
    if (!res.ok) {
      setQuoteError(res.error);
      return null;
    }
    setQuoteError(null);
    setQuote(res.quote);
    return res.quote;
  }, []);

  // Gabungkan keranjang lokal (bila belum milik user ini), lalu muat ringkasan.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const state = useCartStore.getState();
      const guest =
        state.ownerId === userId
          ? []
          : state.items.map((i) => ({
              productId: i.productId,
              variantId: i.variantId,
              quantity: i.quantity,
            }));
      const synced = await syncCart(guest);
      if (cancelled) return;
      if (synced.ok) useCartStore.getState().replaceItems(synced.lines.map(lineToCartItem), userId);
      await loadQuote();
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, loadQuote]);

  // Tarif kurir setiap alamat berubah (atau alamat yang sama diubah).
  const hasLines = !!quote && quote.lines.length > 0;
  useEffect(() => {
    if (!addressId || !hasLines) return;
    let cancelled = false;
    void getShippingOptions({ addressId }).then((res) => {
      if (cancelled) return;
      setRates(
        res.ok
          ? { addressId, rates: res.rates, error: null }
          : { addressId, rates: [], error: res.error },
      );
      setRateId((prev) => (res.ok && res.rates.some((r) => r.id === prev) ? prev : null));
    });
    return () => {
      cancelled = true;
    };
  }, [addressId, hasLines, ratesNonce]);

  const currentRates = rates && rates.addressId === addressId ? rates : undefined;
  const rate = currentRates?.rates.find((r) => r.id === rateId) ?? null;
  const shipping = rate?.price ?? 0;
  const total = quote ? quote.subtotal - quote.discount + shipping : 0;

  function applyVoucher() {
    const code = voucherInput.trim();
    if (!code) return;
    startVoucher(async () => {
      const q = await loadQuote(code);
      if (!q) return;
      if (q.voucherApplied) {
        setVoucherCode(code);
        toast.success("Voucher dipakai", { description: `Hemat ${formatIDR(q.discount)}` });
      } else {
        setVoucherCode(undefined);
        toast.error(q.voucherMessage ?? "Voucher tidak bisa dipakai.");
      }
    });
  }

  function removeVoucher() {
    setVoucherCode(undefined);
    setVoucherInput("");
    startVoucher(async () => {
      await loadQuote();
    });
  }

  const missing = !addressId
    ? "Pilih alamat pengiriman."
    : !rate
      ? "Pilih kurir pengiriman."
      : !provider
        ? "Pilih metode pembayaran."
        : isTurnstileRequired() && !turnstileToken
          ? "Selesaikan verifikasi keamanan."
          : null;

  function submit() {
    if (missing || !addressId || !rate || !provider) {
      toast.error(missing ?? "Lengkapi data checkout.");
      return;
    }
    startPlacing(async () => {
      const res = await placeOrder({
        checkoutKey,
        addressId,
        rateId: rate.id,
        voucherCode,
        paymentProvider: provider,
        note: note.trim() || undefined,
        turnstileToken: turnstileToken ?? undefined,
      });
      if (!res.ok) {
        toast.error(res.error);
        setTurnstileToken(null);
        setTurnstileKey((k) => k + 1);
        void loadQuote(voucherCode);
        return;
      }
      useCartStore.getState().replaceItems([], userId);
      if (res.paymentUrl) {
        // Halaman bayar Mayar (atau simulator di dev). Kembali ke halaman status setelahnya.
        window.location.assign(res.paymentUrl);
        return;
      }
      if (res.paymentError) toast.info(res.paymentError);
      router.replace(`/checkout/success?order=${encodeURIComponent(res.orderNumber)}`);
    });
  }

  if (quoteError && !quote) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title={
          quoteError === "Keranjang kosong."
            ? "Keranjang masih kosong"
            : "Checkout belum bisa dimuat"
        }
        description={
          quoteError === "Keranjang kosong."
            ? "Tambahkan produk dulu sebelum checkout."
            : quoteError
        }
        action={{ label: "Lihat keranjang", href: "/cart" }}
      />
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
      <div className="flex flex-col gap-5">
        {/* 1. Alamat */}
        <Step
          n={1}
          title="Alamat pengiriman"
          aside={
            addresses.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDialog({ open: true, edit: null })}
              >
                <Plus className="size-4" /> Tambah
              </Button>
            ) : null
          }
        >
          {addresses.length === 0 ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted-foreground">Belum ada alamat tersimpan.</p>
              <Button type="button" onClick={() => setDialog({ open: true, edit: null })}>
                <MapPin className="size-4" /> Tambah alamat
              </Button>
            </div>
          ) : (
            <RadioGroup
              value={addressId ?? undefined}
              onValueChange={setAddressId}
              aria-label="Alamat pengiriman"
              className="gap-3"
            >
              {addresses.map((a) => (
                <label
                  key={a.id}
                  className={cn(
                    "flex cursor-pointer gap-3 rounded-lg border border-border p-4 transition-colors",
                    addressId === a.id && "border-primary bg-steel-50",
                  )}
                >
                  <RadioGroupItem value={a.id} className="mt-1" />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm">
                    <span className="flex flex-wrap items-center gap-2 font-semibold">
                      {a.recipient}
                      <span className="font-normal text-muted-foreground">{a.phone}</span>
                      {a.label ? <Badge variant="secondary">{a.label}</Badge> : null}
                      {a.isDefault ? <Badge variant="outline">Utama</Badge> : null}
                    </span>
                    <span className="text-muted-foreground">
                      {a.fullAddress}, {a.district}, {a.city}, {a.province} {a.postalCode}
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 text-muted-foreground"
                    aria-label={`Ubah alamat ${a.recipient}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setDialog({ open: true, edit: a });
                    }}
                  >
                    <Pencil className="size-4" strokeWidth={1.75} />
                  </Button>
                </label>
              ))}
            </RadioGroup>
          )}
        </Step>

        {/* 2. Kurir */}
        <Step n={2} title="Kurir & ongkir">
          {!addressId ? (
            <p className="text-sm text-muted-foreground">Pilih alamat dulu untuk melihat ongkir.</p>
          ) : !currentRates ? (
            <div className="flex flex-col gap-2" aria-busy="true" aria-label="Memuat ongkir">
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
            </div>
          ) : currentRates.error ? (
            <p className="text-sm text-danger" role="alert">
              {currentRates.error}
            </p>
          ) : (
            <RadioGroup
              value={rateId ?? undefined}
              onValueChange={setRateId}
              aria-label="Layanan kurir"
              className="gap-2"
            >
              {currentRates.rates.map((r) => (
                <label
                  key={r.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border border-border px-4 py-3 transition-colors",
                    rateId === r.id && "border-primary bg-steel-50",
                  )}
                >
                  <RadioGroupItem value={r.id} />
                  <Truck
                    className="size-5 shrink-0 text-steel-700"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <span className="flex min-w-0 flex-1 flex-col text-sm">
                    <span className="flex flex-wrap items-center gap-2 font-medium">
                      {r.courierName} {r.serviceName}
                      {r.isTest ? <Badge variant="outline">Tarif uji</Badge> : null}
                    </span>
                    <span className="text-caption text-muted-foreground">Estimasi {r.etd}</span>
                  </span>
                  <span className="text-sm font-semibold tabular-nums">{formatIDR(r.price)}</span>
                </label>
              ))}
            </RadioGroup>
          )}
        </Step>

        {/* 3. Voucher */}
        <Step n={3} title="Voucher">
          {voucherCode && quote?.voucherApplied ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-success/40 bg-success/5 px-4 py-3 text-sm">
              <span>
                <span className="font-semibold">{voucherCode.toUpperCase()}</span> dipakai, hemat{" "}
                <span className="font-semibold tabular-nums">{formatIDR(quote.discount)}</span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={removeVoucher}
                disabled={voucherPending}
              >
                Lepas
              </Button>
            </div>
          ) : (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                applyVoucher();
              }}
            >
              <Label htmlFor="voucher" className="sr-only">
                Kode voucher
              </Label>
              <Input
                id="voucher"
                value={voucherInput}
                onChange={(e) => setVoucherInput(e.target.value)}
                placeholder="Masukkan kode voucher"
                autoCapitalize="characters"
                maxLength={32}
                className="h-11"
              />
              <Button
                type="submit"
                variant="outline"
                className="h-11"
                disabled={voucherPending || !voucherInput.trim()}
              >
                {voucherPending ? <Spinner className="size-4" /> : null}
                Pakai
              </Button>
            </form>
          )}
        </Step>

        {/* 4. Pembayaran */}
        <Step n={4} title="Metode pembayaran">
          {paymentProviders.length === 0 ? (
            <p className="text-sm text-danger" role="alert">
              Pembayaran belum tersedia. Hubungi kami lewat WhatsApp.
            </p>
          ) : (
            <RadioGroup
              value={provider ?? undefined}
              onValueChange={(v) => setProvider(v as PaymentProviderId)}
              aria-label="Metode pembayaran"
              className="gap-2"
            >
              {paymentProviders.map((p) => (
                <label
                  key={p}
                  className={cn(
                    "flex cursor-pointer gap-3 rounded-lg border border-border px-4 py-3 transition-colors",
                    provider === p && "border-primary bg-steel-50",
                  )}
                >
                  <RadioGroupItem value={p} className="mt-0.5" />
                  <span className="flex flex-col text-sm">
                    <span className="font-medium">{PAYMENT_LABELS[p].title}</span>
                    <span className="text-caption text-muted-foreground">
                      {PAYMENT_LABELS[p].description}
                    </span>
                  </span>
                </label>
              ))}
            </RadioGroup>
          )}
          <p className="text-caption text-muted-foreground">
            Setelah pesanan dibuat, kamu diarahkan ke halaman pembayaran Mayar. Batas waktu bayar{" "}
            {formatTimeout(paymentTimeoutMinutes)}.
          </p>
        </Step>
      </div>

      {/* 5. Ringkasan */}
      <aside
        aria-labelledby="order-summary"
        className="flex flex-col gap-4 rounded-xl border border-border p-5 lg:sticky lg:top-36"
      >
        <h2 id="order-summary" className="text-base">
          Ringkasan pesanan
        </h2>

        {!quote ? (
          <div className="flex flex-col gap-3" aria-busy="true">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <>
            <ul className="flex max-h-72 flex-col gap-3 overflow-y-auto">
              {quote.lines.map((l) => (
                <li key={`${l.productId}:${l.variantId ?? ""}`} className="flex gap-3">
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-md border border-border bg-steel-50">
                    <ProductImage
                      publicId={l.imagePublicId}
                      alt={l.name ?? "Produk"}
                      sizes="48px"
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col text-sm">
                    <span className="line-clamp-1 font-medium">
                      {l.name ?? "Produk tidak tersedia"}
                    </span>
                    {l.variantName ? (
                      <span className="text-caption text-muted-foreground">{l.variantName}</span>
                    ) : null}
                    <span className="text-caption text-muted-foreground tabular-nums">
                      {l.quantity} × {formatIDR(l.unitPrice)}
                    </span>
                    {l.status !== "ok" ? (
                      <span className="text-caption text-danger">
                        {l.status === "unavailable"
                          ? "Tidak tersedia"
                          : `Stok tinggal ${l.available}`}
                      </span>
                    ) : null}
                  </div>
                  <span className="text-sm font-medium tabular-nums">
                    {formatIDR(l.unitPrice * l.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <Separator />

            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="tabular-nums">{formatIDR(quote.subtotal)}</dd>
              </div>
              {quote.flashSavings > 0 ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Hemat flash sale</dt>
                  <dd className="text-success tabular-nums">{formatIDR(quote.flashSavings)}</dd>
                </div>
              ) : null}
              {quote.discount > 0 ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Diskon voucher</dt>
                  <dd className="text-success tabular-nums">−{formatIDR(quote.discount)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Ongkir</dt>
                <dd className="tabular-nums">{rate ? formatIDR(shipping) : "—"}</dd>
              </div>
            </dl>

            <Separator />

            <div className="flex items-baseline justify-between gap-4">
              <span className="font-semibold">Total bayar</span>
              <span className="text-xl font-bold tabular-nums">{formatIDR(total)}</span>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="order-note">Catatan untuk penjual (opsional)</Label>
              <Textarea
                id="order-note"
                rows={2}
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Contoh: tolong cek ulang ukuran sebelum dikirim"
              />
            </div>

            <TurnstileWidgetLazy
              key={turnstileKey}
              onVerify={setTurnstileToken}
              onExpire={() => setTurnstileToken(null)}
              onError={() => setTurnstileToken(null)}
            />

            {!quote.allOk ? (
              <p className="text-caption text-danger" role="alert">
                Ada produk yang stoknya berubah.{" "}
                <Link href="/cart" className="underline">
                  Perbarui keranjang
                </Link>
                .
              </p>
            ) : null}

            <Button
              type="button"
              size="lg"
              onClick={submit}
              disabled={placing || !quote.allOk || paymentProviders.length === 0}
              aria-describedby={missing ? "checkout-missing" : undefined}
            >
              {placing ? <Spinner className="size-4" /> : null}
              {placing ? "Membuat pesanan…" : "Buat pesanan & bayar"}
            </Button>
            {missing && quote.allOk ? (
              <p id="checkout-missing" className="text-caption text-muted-foreground">
                {missing}
              </p>
            ) : null}
          </>
        )}
      </aside>

      <AddressDialog
        open={dialog.open}
        initial={dialog.edit}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        onSaved={(saved) => {
          setAddresses((list) => {
            const others = list
              .filter((a) => a.id !== saved.id)
              .map((a) => (saved.isDefault ? { ...a, isDefault: false } : a));
            return [saved, ...others];
          });
          setAddressId(saved.id);
          setRates(undefined);
          setRatesNonce((n) => n + 1);
        }}
      />
    </div>
  );
}
