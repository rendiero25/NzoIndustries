"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, ChevronDown, ChevronUp, Tag, X } from "lucide-react";
import { toast } from "sonner";

import { CartLineCard, type CartLineView } from "@/components/store/cart-line-card";
import { CartCheckoutStepper } from "@/components/store/cart-checkout-stepper";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

type AddressRow = {
  id: string;
  label: string | null;
  recipient: string;
  phone: string;
  full_address: string;
  district: string;
  city: string;
  province: string;
  postal_code: string;
  is_default: boolean;
};

type ShippingOption = {
  courierCode: string;
  serviceCode: string;
  courierName: string;
  serviceName: string;
  price: number;
  etd: string;
};

export type AvailableCoupon = {
  id: string;
  code: string;
  title: string | null;
  description: string | null;
  type: "percentage" | "fixed";
  value: number;
  min_purchase: number;
  max_discount: number | null;
  valid_until: string | null;
  image_url: string | null;
  applies_to: "all" | "product" | "category" | "brand";
  applies_to_ids: string[];
};

const COURIER_LOGOS: Record<string, string> = {
  jne: "/couriers/jne.png",
  sicepat: "/couriers/sicepat.png",
  jnt: "/couriers/j&t.png",
  anteraja: "/couriers/antaraja.png",
  tiki: "/couriers/tiki.png",
  ninja: "/couriers/ninjaexpress.png",
  ninja_xpress: "/couriers/ninjaexpress.png",
  lion: "/couriers/lionparcel.png",
  wahana: "/couriers/wahana.png",
  sap: "/couriers/sap.png",
  pos: "/couriers/posindonesia.png",
  idexpress: "/couriers/idexpress.png",
  paxel: "/couriers/paxel.png",
  rpx: "/couriers/rpx.png",
  gojek: "/couriers/gojek.png",
  gosend: "/couriers/gojek.png",
  grab: "/couriers/grab.png",
  borzo: "/couriers/borzo.png",
  lalamove: "/couriers/lalamove.png",
  sentralcargo: "/couriers/sentralcargo.png",
  dash_express: "/couriers/dash.png",
  deliveree: "/couriers/deliveree.png",
};

function CourierLogo({
  code,
  name,
  className = "h-7 w-auto max-w-[72px]",
}: {
  code: string;
  name: string;
  className?: string;
}) {
  const src = COURIER_LOGOS[code.toLowerCase()];
  if (!src) return null;
  return (
    <img
      src={src}
      alt={name}
      className={`shrink-0 object-contain ${className}`}
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
  );
}

type CheckoutPageClientProps = {
  lines: CartLineView[];
  addresses: AddressRow[];
  initialAddressId: string | null;
  availableCoupons: AvailableCoupon[];
  isBuyNow?: boolean;
};

export function CheckoutPageClient({
  lines,
  addresses,
  initialAddressId,
  availableCoupons,
  isBuyNow = false,
}: CheckoutPageClientProps) {
  const [addressId, setAddressId] = useState<string>(initialAddressId ?? addresses[0]?.id ?? "");
  const [shippingOpen, setShippingOpen] = useState(true);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponLabel, setCouponLabel] = useState("");
  const [couponApplying, setCouponApplying] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const subtotalGross = useMemo(() => lines.reduce((s, l) => s + l.listPrice * l.qty, 0), [lines]);
  const subtotalNet = useMemo(() => lines.reduce((s, l) => s + l.unitPrice * l.qty, 0), [lines]);

  const appliedCoupon = useMemo(
    () =>
      couponDiscount > 0
        ? (availableCoupons.find((c) => c.code.toUpperCase() === couponInput.toUpperCase()) ?? null)
        : null,
    [couponDiscount, couponInput, availableCoupons],
  );

  const eligibleLineIds = useMemo(() => {
    if (!appliedCoupon) return new Set<string>();
    if (appliedCoupon.applies_to === "all" || appliedCoupon.applies_to_ids.length === 0) {
      return new Set(lines.map((l) => l.lineId));
    }
    return new Set(
      lines
        .filter((l) => {
          if (appliedCoupon.applies_to === "product")
            return appliedCoupon.applies_to_ids.includes(l.productId);
          if (appliedCoupon.applies_to === "category")
            return l.categoryId != null && appliedCoupon.applies_to_ids.includes(l.categoryId);
          if (appliedCoupon.applies_to === "brand")
            return l.brandId != null && appliedCoupon.applies_to_ids.includes(l.brandId);
          return false;
        })
        .map((l) => l.lineId),
    );
  }, [appliedCoupon, lines]);
  const flashSaleDiscount = useMemo(
    () =>
      lines
        .filter((l) => l.isFlashSale)
        .reduce((s, l) => s + Math.max(0, l.listPrice - l.unitPrice) * l.qty, 0),
    [lines],
  );
  const regularDiscount = useMemo(
    () => Math.max(0, Math.round(subtotalGross - subtotalNet) - flashSaleDiscount),
    [subtotalGross, subtotalNet, flashSaleDiscount],
  );
  const serviceFee = 1000;
  const shippingFee = selectedShipping?.price ?? 0;
  const grandTotal = Math.max(
    0,
    Math.round(subtotalNet) - couponDiscount + shippingFee + serviceFee,
  );
  const itemCount = useMemo(() => lines.reduce((s, l) => s + l.qty, 0), [lines]);

  const selectedAddress = useMemo(
    () => addresses.find((a) => a.id === addressId) ?? null,
    [addresses, addressId],
  );

  const couponEligibilityList = useMemo(
    () =>
      availableCoupons
        .map((c) => {
          let notEligible: string | null = null;
          if (c.min_purchase > 0 && subtotalNet < c.min_purchase) {
            notEligible = `Min. belanja ${formatRupiah(c.min_purchase)} (kurang ${formatRupiah(c.min_purchase - subtotalNet)})`;
          } else if (c.applies_to !== "all" && c.applies_to_ids.length > 0) {
            const hasEligible = lines.some((l) => {
              if (c.applies_to === "product") return c.applies_to_ids.includes(l.productId);
              if (c.applies_to === "category")
                return l.categoryId != null && c.applies_to_ids.includes(l.categoryId);
              if (c.applies_to === "brand")
                return l.brandId != null && c.applies_to_ids.includes(l.brandId);
              return true;
            });
            if (!hasEligible) {
              const scopeLabel =
                c.applies_to === "product"
                  ? "produk"
                  : c.applies_to === "category"
                    ? "kategori"
                    : "merek";
              notEligible = `Tidak ada ${scopeLabel} yang memenuhi syarat kupon ini di pesanan Anda`;
            }
          }
          return { c, notEligible };
        })
        .sort((a, b) => (a.notEligible ? 1 : 0) - (b.notEligible ? 1 : 0)),
    [availableCoupons, subtotalNet, lines],
  );

  const loadRates = useCallback(async () => {
    if (!addressId) return;
    setRatesLoading(true);
    try {
      const body: Record<string, unknown> = { addressId };
      if (isBuyNow && lines[0]) {
        body.variantId = lines[0].variantId;
        body.qty = lines[0].qty;
      }
      const res = await fetch("/api/shipping/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: { options: ShippingOption[] };
        error?: string;
      };
      if (!json.success || !json.data) {
        toast.error(json.error ?? "Gagal memuat ongkir.");
        setShippingOptions([]);
        setSelectedShipping(null);
        return;
      }
      setShippingOptions(json.data.options);
      setSelectedShipping(json.data.options[0] ?? null);
      setShippingOpen(!json.data.options[0]);
    } catch {
      toast.error("Gagal memuat ongkir.");
      setShippingOptions([]);
      setSelectedShipping(null);
    } finally {
      setRatesLoading(false);
    }
  }, [addressId, isBuyNow, lines]);

  useEffect(() => {
    void loadRates();
  }, [loadRates]);

  const applyCoupon = useCallback(
    async (overrideCode?: string, silent = false) => {
      const code = (overrideCode ?? couponInput).trim();
      if (!code) {
        setCouponDiscount(0);
        return;
      }
      if (!silent) setCouponApplying(true);
      try {
        const res = await fetch("/api/coupons/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            subtotal: Math.round(subtotalNet),
            lines: lines.map((l) => ({
              productId: l.productId,
              categoryId: l.categoryId,
              brandId: l.brandId,
              unitPrice: l.unitPrice,
              qty: l.qty,
            })),
          }),
        });
        const json = (await res.json()) as {
          success: boolean;
          data?: { discountAmount: number };
          error?: string;
        };
        if (!json.success || !json.data) {
          if (silent) toast.info("Kupon tidak berlaku untuk produk yang tersisa.");
          else toast.error(json.error ?? "Kupon tidak bisa dipakai.");
          setCouponDiscount(0);
          setCouponInput("");
          setCouponLabel("");
          return;
        }
        setCouponDiscount(json.data.discountAmount);
        const matched = availableCoupons.find((c) => c.code.toUpperCase() === code.toUpperCase());
        setCouponLabel(
          matched?.title ??
            (matched
              ? matched.type === "percentage"
                ? `${matched.value}% OFF`
                : `−${formatRupiah(matched.value)}`
              : "Diskon kupon"),
        );
        if (!silent) toast.success("Kupon diterapkan.");
      } catch {
        if (!silent) toast.error("Gagal memvalidasi kupon.");
        setCouponDiscount(0);
      } finally {
        if (!silent) setCouponApplying(false);
      }
    },
    [availableCoupons, couponInput, lines, subtotalNet],
  );

  const linesChangedRef = useRef(false);
  useEffect(() => {
    if (!linesChangedRef.current) {
      linesChangedRef.current = true;
      return;
    }
    if (!couponInput.trim() || couponDiscount === 0) return;
    void applyCoupon(couponInput.trim(), true);
  }, [lines, applyCoupon, couponInput, couponDiscount]);

  const handleCheckout = async () => {
    if (!addressId || !selectedShipping) {
      toast.error("Pilih alamat dan metode pengiriman.");
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addressId,
          courierCode: selectedShipping.courierCode,
          serviceCode: selectedShipping.serviceCode,
          ratesSource: "biteship",
          couponCode: couponInput.trim() || null,
          ...(isBuyNow
            ? { buyNow: { variantId: lines[0]!.variantId, qty: lines[0]!.qty } }
            : { lineIds: lines.map((l) => l.lineId) }),
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: {
          orderId: string;
          orderNumber: string;
          paymentUrl: string;
        };
        error?: string;
      };
      if (!json.success || !json.data) {
        toast.error(json.error ?? "Checkout gagal.");
        setSubmitting(false);
        return;
      }

      // Hosted Mayar payment page; Mayar redirects back to the order detail page.
      // Keep the button in its loading state while the browser navigates away.
      window.location.assign(json.data.paymentUrl);
    } catch {
      toast.error("Terjadi kesalahan jaringan.");
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="bg-gradient-to-b from-[#f4f1ea]/50 to-transparent pt-6 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] text-[#1d1d1f] sm:pt-8 md:pb-20 lg:pb-20">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-24">
          <div className="py-2 sm:py-3">
            <CartCheckoutStepper current={2} />
          </div>

          <div className="mt-6 md:mt-8 md:grid md:grid-cols-12 md:items-start md:gap-6 lg:gap-8">
            <div className="md:col-span-7">
              <div className="rounded-md border border-[#e8e4dc] bg-white p-4 sm:p-6">
                <h1 className="text-xl font-bold text-[#1d1d1f] sm:text-2xl">Checkout</h1>
                <p className="mt-1 text-sm text-[#5c5c5c]">
                  Periksa barang sebelum memilih pengiriman dan pembayaran.
                </p>
                <ul className="mt-8 space-y-10">
                  {lines.map((line) => (
                    <li
                      key={line.lineId}
                      className="border-b border-[#ece8e0] pb-10 last:border-0 last:pb-0"
                    >
                      {eligibleLineIds.has(line.lineId) && (
                        <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-[#EA5329]/10 px-3 py-1.5">
                          <Tag className="h-3.5 w-3.5 shrink-0 text-[#EA5329]" />
                          <span className="text-[12px] font-semibold text-[#EA5329]">
                            Dapat potongan kupon {couponInput.toUpperCase()}
                          </span>
                        </div>
                      )}
                      <CartLineCard line={line} readonly={isBuyNow} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <aside className="mt-6 space-y-4 md:col-span-5 md:mt-0">
              <div className="overflow-hidden rounded-md border border-[#e0e0e0] bg-white">
                <div className="flex items-center justify-between bg-[#2a2a2c] px-4 py-3 text-white">
                  <span className="text-sm font-semibold uppercase">Pilih alamat</span>
                  <ChevronDown className="h-4 w-4 opacity-80" aria-hidden />
                </div>
                <div className="p-4">
                  {addresses.length === 0 ? (
                    <p className="text-sm text-[#5c5c5c]">Belum ada alamat tersimpan.</p>
                  ) : (
                    <>
                      <Select value={addressId} onValueChange={setAddressId}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih alamat pengiriman..." />
                        </SelectTrigger>
                        <SelectContent>
                          {addresses.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {(a.label ?? "Alamat").trim()} — {a.city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedAddress ? (
                        <div className="mt-3 text-sm leading-relaxed text-[#333333]">
                          <p className="font-semibold text-[#1d1d1f]">
                            {selectedAddress.recipient}
                          </p>
                          <p className="mt-1 text-[#5c5c5c]">
                            {selectedAddress.full_address}, {selectedAddress.district},{" "}
                            {selectedAddress.city}, {selectedAddress.province}{" "}
                            {selectedAddress.postal_code}
                          </p>
                          <p className="mt-1 text-[#5c5c5c]">{selectedAddress.phone}</p>
                        </div>
                      ) : null}
                    </>
                  )}
                  <Link
                    href="/dashboard/addresses/new?redirectTo=/checkout"
                    className="mt-4 inline-block text-sm font-semibold text-[#EA5329] hover:underline"
                  >
                    Tambah alamat baru
                  </Link>
                </div>
              </div>

              <Collapsible
                open={shippingOpen}
                onOpenChange={setShippingOpen}
                className="overflow-hidden rounded-md border border-[#e0e0e0] bg-white"
              >
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className={cn(
                      "h-auto w-full justify-between rounded-none px-4 py-4 hover:bg-transparent",
                      selectedShipping && !shippingOpen
                        ? "bg-white text-[#1d1d1f]"
                        : "bg-[#2a2a2c] text-white hover:bg-[#2a2a2c]",
                    )}
                  >
                    <span className="text-sm font-semibold uppercase">Metode pengiriman</span>
                    {selectedShipping && !shippingOpen ? (
                      <span className="flex items-center gap-2">
                        <CourierLogo
                          code={selectedShipping.courierCode}
                          name={selectedShipping.courierName}
                          className="h-6 w-auto max-w-[56px]"
                        />
                        <span className="flex flex-col items-end">
                          <span className="text-sm leading-tight font-semibold text-[#1d1d1f]">
                            {selectedShipping.serviceName} · {formatRupiah(selectedShipping.price)}
                          </span>
                          <span className="text-[11px] leading-tight text-[#7a7a7a]">
                            {selectedShipping.etd}
                          </span>
                        </span>
                        <ChevronDown
                          className="h-4 w-4 shrink-0 text-[#1d1d1f] opacity-50"
                          aria-hidden
                        />
                      </span>
                    ) : shippingOpen ? (
                      <ChevronUp className="h-4 w-4 opacity-80" aria-hidden />
                    ) : (
                      <ChevronDown className="h-4 w-4 opacity-80" aria-hidden />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 p-4">
                  {ratesLoading ? (
                    <div className="flex items-center gap-2 text-sm text-[#5c5c5c]">
                      <Spinner className="size-4" />
                      Menghitung ongkir…
                    </div>
                  ) : shippingOptions.length === 0 ? null : (
                    <>
                      {shippingOptions.map((opt) => {
                        const selected =
                          selectedShipping?.courierCode === opt.courierCode &&
                          selectedShipping?.serviceCode === opt.serviceCode;
                        return (
                          <label
                            key={`${opt.courierCode}-${opt.serviceCode}`}
                            className={cn(
                              "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 text-sm transition",
                              selected
                                ? "border-[#EA5329] bg-[#fff8f5]"
                                : "border-[#e0e0e0] bg-[#fafafa] hover:border-[#EA5329]/40",
                            )}
                            onClick={() => {
                              setSelectedShipping(opt);
                              setShippingOpen(false);
                            }}
                          >
                            <input
                              type="radio"
                              name="ship"
                              className="mt-1 accent-[#EA5329]"
                              checked={selected}
                              onChange={() => {
                                setSelectedShipping(opt);
                                setShippingOpen(false);
                              }}
                            />
                            <span className="flex flex-1 items-center gap-3">
                              <CourierLogo code={opt.courierCode} name={opt.courierName} />
                              <span>
                                <span className="font-semibold text-[#1d1d1f]">
                                  {opt.courierName} — {opt.serviceName}
                                </span>
                                <span className="mt-0.5 block text-xs text-[#7a7a7a]">
                                  {opt.etd}
                                </span>
                                <span className="mt-1 block text-sm font-bold text-[#1d1d1f] tabular-nums">
                                  {formatRupiah(opt.price)}
                                </span>
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </>
                  )}
                </CollapsibleContent>
              </Collapsible>

              <div className="overflow-hidden rounded-md border border-[#1a1a1a]/40 bg-[#1a1a1a] text-white">
                <div className="px-5 pt-5">
                  <h2 className="text-lg font-bold">Ringkasan pesanan</h2>
                  <dl className="mt-5 space-y-3 border-b border-white/15 pb-5 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-white/75">Sub total ({itemCount} item)</dt>
                      <dd className="shrink-0 font-semibold tabular-nums">
                        {formatRupiah(subtotalGross)}
                      </dd>
                    </div>
                    {regularDiscount > 0 && (
                      <div className="flex justify-between gap-4">
                        <dt className="text-white/75">Diskon produk</dt>
                        <dd className="shrink-0 font-semibold text-[#ffb4a1] tabular-nums">
                          −{formatRupiah(regularDiscount)}
                        </dd>
                      </div>
                    )}
                    {flashSaleDiscount > 0 && (
                      <div className="flex justify-between gap-4">
                        <dt className="text-white/75">Diskon flash sale</dt>
                        <dd className="shrink-0 font-semibold text-[#ffb4a1] tabular-nums">
                          −{formatRupiah(flashSaleDiscount)}
                        </dd>
                      </div>
                    )}
                    {couponDiscount > 0 ? (
                      <div className="flex flex-col gap-0.5">
                        <div className="flex justify-between gap-4">
                          <dt className="text-white/75">Diskon kupon</dt>
                          <dd className="shrink-0 font-semibold text-[#ffb4a1] tabular-nums">
                            −{formatRupiah(couponDiscount)}
                          </dd>
                        </div>
                        {appliedCoupon && (
                          <p className="text-[11px] text-white/50">
                            {appliedCoupon.applies_to === "all" ||
                            appliedCoupon.applies_to_ids.length === 0
                              ? "Berlaku untuk semua produk"
                              : `Berlaku untuk ${eligibleLineIds.size} produk di pesanan ini`}
                          </p>
                        )}
                      </div>
                    ) : null}
                    <div className="flex justify-between gap-4">
                      <dt className="text-white/75">Ongkir</dt>
                      <dd className="shrink-0 font-semibold tabular-nums">
                        {ratesLoading ? (
                          <span className="text-white/50">Menghitung…</span>
                        ) : shippingFee > 0 ? (
                          formatRupiah(shippingFee)
                        ) : (
                          <span className="text-white/50">Belum dipilih</span>
                        )}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-white/75">Biaya jasa aplikasi</dt>
                      <dd className="shrink-0 font-semibold tabular-nums">
                        {formatRupiah(serviceFee)}
                      </dd>
                    </div>
                  </dl>

                  <div className="border-t border-white/15 py-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-white/60 uppercase">
                        Ada kupon diskon?
                      </p>
                      {availableCoupons.length > 0 && (
                        <Button
                          type="button"
                          variant="link"
                          size="xs"
                          onClick={() => setPromoOpen(true)}
                          className="h-auto gap-1 p-0 text-[11px] font-semibold text-white"
                        >
                          <Tag className="h-3 w-3" />
                          pakai promo biar lebih hemat
                        </Button>
                      )}
                    </div>
                    {couponDiscount > 0 ? (
                      <div className="mt-2 flex items-center gap-3 rounded-lg border border-[#EA5329]/40 bg-[#EA5329]/10 px-3 py-2.5">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-[#EA5329]" />
                        <span className="min-w-0 flex-1 text-sm font-semibold text-white">
                          {couponInput.toUpperCase()} · {couponLabel}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setCouponDiscount(0);
                            setCouponInput("");
                            setCouponLabel("");
                          }}
                          className="h-6 w-6 shrink-0 rounded-full bg-white/15 text-white hover:bg-white/25"
                          aria-label="Hapus kupon"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                        <Input
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value)}
                          placeholder="Kode kupon"
                          className="h-11 min-w-0 flex-1 rounded-lg border-white/20 bg-black/20 text-sm text-white placeholder:text-white/40 focus-visible:ring-[#EA5329]/40"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          loading={couponApplying}
                          onClick={() => void applyCoupon(undefined)}
                          className="h-11 shrink-0 border-white/30 bg-transparent text-white hover:bg-white/10"
                        >
                          Pakai
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-end justify-between gap-4 border-t border-white/15 py-5">
                    <div>
                      <p className="text-xs font-semibold text-white/60 uppercase">Total</p>
                      <p className="mt-1 text-2xl font-bold tabular-nums">
                        {formatRupiah(grandTotal)}
                      </p>
                      {couponDiscount > 0 ? (
                        <p className="mt-1 text-[11px] text-white/55">
                          Sudah termasuk diskon kupon.
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-[#e8e4dc] bg-white p-5">
                <Button
                  type="button"
                  variant="primary"
                  loading={submitting}
                  disabled={!addressId || !selectedShipping || addresses.length === 0}
                  onClick={() => void handleCheckout()}
                  className="w-full uppercase"
                >
                  Beli sekarang
                </Button>
                <p className="mt-3 text-center text-[10px] leading-relaxed text-[#9a9590]">
                  Pilih metode pembayaran di langkah berikutnya. Dengan melanjutkan, Anda menyetujui
                  syarat pembayaran Mayar dan kebijakan toko.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <Dialog open={promoOpen} onOpenChange={setPromoOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-hidden p-0">
          <DialogHeader className="flex-row items-center justify-between border-b border-[#e0e0e0] px-6 py-4">
            <DialogTitle className="text-[17px] font-semibold text-[#1d1d1f]">
              Promo tersedia
            </DialogTitle>
            <Button
              type="button"
              variant="pearl"
              size="icon-sm"
              onClick={() => setPromoOpen(false)}
              aria-label="Tutup"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>

          <div className="overflow-y-auto px-6 pt-4 pb-6">
            {availableCoupons.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#7a7a7a]">Tidak ada promo tersedia.</p>
            ) : (
              <ul className="space-y-3">
                {couponEligibilityList.map(({ c, notEligible }) => (
                  <li key={c.id}>
                    <div
                      className={cn(
                        "overflow-hidden rounded-md border bg-white transition",
                        notEligible ? "border-[#e0e0e0] opacity-60" : "border-[#e0e0e0]",
                      )}
                    >
                      {c.image_url && (
                        <div className="relative h-28 w-full bg-[#f5f5f7]">
                          <Image
                            src={c.image_url}
                            alt={c.title ?? c.code}
                            fill
                            className="object-cover"
                            sizes="448px"
                          />
                        </div>
                      )}
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <span
                              className={cn(
                                "inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase",
                                notEligible
                                  ? "bg-[#e0e0e0] text-[#9a9590]"
                                  : "bg-[#EA5329]/10 text-[#EA5329]",
                              )}
                            >
                              {c.type === "percentage"
                                ? `${c.value}% OFF`
                                : `−${formatRupiah(c.value)}`}
                            </span>
                            <p className="mt-1.5 font-mono text-lg font-bold tracking-widest text-[#1d1d1f]">
                              {c.code}
                            </p>
                            {c.title && (
                              <p className="mt-0.5 text-sm font-semibold text-[#1d1d1f]">
                                {c.title}
                              </p>
                            )}
                            {c.description && (
                              <p className="mt-1 text-sm leading-relaxed text-[#5c5c5c]">
                                {c.description}
                              </p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#7a7a7a]">
                              {c.min_purchase > 0 && (
                                <span>Min. belanja {formatRupiah(c.min_purchase)}</span>
                              )}
                              {c.max_discount != null && (
                                <span>Maks. diskon {formatRupiah(c.max_discount)}</span>
                              )}
                              {c.valid_until && (
                                <span>
                                  s.d.{" "}
                                  {new Date(c.valid_until).toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                    timeZone: "Asia/Jakarta",
                                  })}
                                </span>
                              )}
                            </div>
                            {notEligible && (
                              <p className="mt-2 text-[11px] font-semibold text-[#EA5329]">
                                {notEligible}
                              </p>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            disabled={!!notEligible}
                            onClick={() => {
                              setCouponInput(c.code);
                              setPromoOpen(false);
                              void applyCoupon(c.code);
                            }}
                            className={cn("shrink-0 text-[13px]", notEligible && "opacity-60")}
                          >
                            Pakai
                          </Button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
