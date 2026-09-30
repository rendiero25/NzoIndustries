"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Truck, X } from "lucide-react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CourierLogo } from "@/components/shared/courier-logo";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

type AddressRow = {
  id: string;
  label: string | null;
  recipient: string;
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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAuthenticated: boolean;
  loginHref: string;
  variantId: string;
  qty: number;
};

export function ProductShippingDialog({
  open,
  onOpenChange,
  isAuthenticated,
  loginHref,
  variantId,
  qty,
}: Props) {
  const [addresses, setAddresses] = useState<AddressRow[] | null>(null);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addressId, setAddressId] = useState<string>("");
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);

  const loadAddresses = useCallback(() => {
    setAddressesLoading(true);
    fetch("/api/addresses")
      .then((r) => r.json())
      .then((json: { success: boolean; data?: AddressRow[] }) => {
        const list = json.success && json.data ? json.data : [];
        setAddresses(list);
        const preferred = list.find((a) => a.is_default) ?? list[0] ?? null;
        if (preferred) setAddressId(preferred.id);
      })
      .catch(() => setAddresses([]))
      .finally(() => setAddressesLoading(false));
  }, []);

  useEffect(() => {
    if (!open || !isAuthenticated || addresses !== null) return;
    loadAddresses();
  }, [open, isAuthenticated, addresses, loadAddresses]);

  const loadRates = useCallback(() => {
    setRatesLoading(true);
    setRatesError(null);
    fetch("/api/shipping/rates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addressId, variantId, qty }),
    })
      .then((r) => r.json())
      .then((json: { success: boolean; data?: { options: ShippingOption[] }; error?: string }) => {
        if (!json.success || !json.data) {
          setOptions([]);
          setRatesError(json.error ?? "Gagal memuat pilihan pengiriman.");
          return;
        }
        setOptions(json.data.options);
      })
      .catch(() => {
        setOptions([]);
        setRatesError("Gagal memuat pilihan pengiriman.");
      })
      .finally(() => setRatesLoading(false));
  }, [addressId, variantId, qty]);

  useEffect(() => {
    if (!open || !addressId) return;
    loadRates();
  }, [open, addressId, loadRates]);

  const selectedAddress = addresses?.find((a) => a.id === addressId) ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="w-[min(28rem,calc(100vw-2rem))] max-w-none">
        <DialogHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <DialogTitle className="flex items-center gap-2 text-[17px] font-semibold text-[#1d1d1f]">
            <Truck className="h-4 w-4 text-[#EA5329]" aria-hidden />
            Pilihan Pengiriman
          </DialogTitle>
          <DialogClose asChild>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Tutup">
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </DialogClose>
        </DialogHeader>

        {!isAuthenticated ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="text-sm text-[#7a7a7a]">
              Masuk ke akun Anda untuk melihat kurir dan estimasi ongkir sesuai alamat Anda.
            </p>
            <Button asChild variant="primary" size="sm">
              <Link href={loginHref}>Masuk terlebih dahulu</Link>
            </Button>
          </div>
        ) : addressesLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-[#7a7a7a]">
            <Spinner className="size-4" />
            Memuat alamat…
          </div>
        ) : !addresses || addresses.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="text-sm text-[#7a7a7a]">Belum ada alamat tersimpan.</p>
            <Button asChild variant="primary" size="sm">
              <Link href="/dashboard/addresses/new">Tambah alamat baru</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Select value={addressId} onValueChange={setAddressId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih alamat..." />
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
                <p className="mt-2 text-xs text-[#7a7a7a]">
                  {selectedAddress.recipient} · {selectedAddress.city}, {selectedAddress.province}{" "}
                  {selectedAddress.postal_code}
                </p>
              ) : null}
            </div>

            <div className="max-h-80 space-y-2 overflow-y-auto">
              {ratesLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-[#7a7a7a]">
                  <Spinner className="size-4" />
                  Menghitung ongkir…
                </div>
              ) : ratesError ? (
                <p className="py-4 text-center text-sm text-[#7a7a7a]">{ratesError}</p>
              ) : options.length === 0 ? (
                <p className="py-4 text-center text-sm text-[#7a7a7a]">
                  Tidak ada kurir tersedia untuk alamat ini.
                </p>
              ) : (
                options.map((opt) => (
                  <div
                    key={`${opt.courierCode}-${opt.serviceCode}`}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm",
                      "border-[#e0e0e0] bg-[#fafafa]",
                    )}
                  >
                    <CourierLogo code={opt.courierCode} name={opt.courierName} />
                    <span className="flex-1">
                      <span className="font-semibold text-[#1d1d1f]">
                        {opt.courierName} — {opt.serviceName}
                      </span>
                      <span className="mt-0.5 block text-xs text-[#7a7a7a]">{opt.etd}</span>
                    </span>
                    <span className="text-sm font-bold text-[#1d1d1f] tabular-nums">
                      {formatRupiah(opt.price)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
