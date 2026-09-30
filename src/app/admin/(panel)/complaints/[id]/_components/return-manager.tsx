"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/format";
import {
  approveReturn,
  confirmReturnReceived,
  createReplacementShipment,
  fetchReplacementShippingRates,
  type ReplacementShippingOption,
} from "../../_actions";

type ReturnData = {
  id: string;
  status: string;
  return_awb: string | null;
  return_courier: string | null;
  proof_images: string[];
  return_shipments: { awb_number: string | null; courier: string | null; status: string | null }[];
};

type OrderItem = {
  product_name: string;
  price: number;
  quantity: number;
  variant_id: string | null;
  weight: number;
};

type OrderSnap = {
  id: string;
  order_number: string;
  shipping_address: string;
  shipping_postal: string;
  shipping_phone: string;
  shipping_name: string;
  order_items: OrderItem[];
};

export function ReturnManager({
  complaintId,
  complaintStatus,
  returnData,
  order,
  userId,
}: {
  complaintId: string;
  complaintStatus: string;
  returnData: ReturnData | null;
  order: OrderSnap | null;
  userId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [options, setOptions] = useState<ReplacementShippingOption[] | null>(null);
  const [loadingRates, setLoadingRates] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [itemQtys, setItemQtys] = useState<Record<number, number>>(() =>
    Object.fromEntries((order?.order_items ?? []).map((item, i) => [i, item.quantity])),
  );
  const [itemSelected, setItemSelected] = useState<Record<number, boolean>>(() =>
    Object.fromEntries((order?.order_items ?? []).map((_, i) => [i, true])),
  );

  function handleApprove() {
    startTransition(async () => {
      const { error } = await approveReturn(complaintId);
      if (error) toast.error(error);
      else toast.success("Retur disetujui.");
    });
  }

  function handleConfirmReceived() {
    if (!returnData) return;
    startTransition(async () => {
      const { error } = await confirmReturnReceived(returnData.id, complaintId);
      if (error) toast.error(error);
      else toast.success("Penerimaan barang dikonfirmasi.");
    });
  }

  // map() sebelum filter(): kalau difilter dulu, index di map adalah index BARU
  // sehingga itemQtys[i] terbaca dari item yang salah saat ada item di-uncheck.
  function selectedItems() {
    return (order?.order_items ?? [])
      .map((item, i) => {
        const qty = itemQtys[i] ?? item.quantity;
        // order_items.weight & value adalah TOTAL per baris (unit × qty asli),
        // sama seperti yang dikirim checkout ke Biteship. Admin bisa mengurangi
        // qty penggantian, jadi turunkan dulu ke satuan lalu kalikan qty baru —
        // kalau tidak, ongkir dihitung memakai berat pesanan penuh.
        const originalQty = Math.max(1, item.quantity);
        const unitWeight = Math.max(1, Math.round((item.weight ?? 500) / originalQty));
        return {
          selected: itemSelected[i] ?? true,
          line: {
            name: item.product_name,
            value: Math.round(item.price * qty),
            quantity: qty,
            weight: unitWeight * qty,
          },
        };
      })
      .filter((it) => it.selected)
      .map((it) => it.line);
  }

  function destinationPostal(): number | null {
    const n = parseInt((order?.shipping_postal ?? "").replace(/\D/g, "").slice(0, 5), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  function handleCheckRates() {
    if (!order) return;
    const items = selectedItems();
    if (items.length === 0) {
      toast.error("Pilih minimal satu item.");
      return;
    }
    const postalCode = destinationPostal();
    if (postalCode == null) {
      toast.error("Kode pos tujuan tidak valid pada pesanan ini.");
      return;
    }

    setLoadingRates(true);
    setOptions(null);
    setSelectedKey(null);
    void fetchReplacementShippingRates({ destinationPostalCode: postalCode, items })
      .then((res) => {
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        setOptions(res.options);
        if (res.options.length > 0) {
          const first = res.options[0];
          setSelectedKey(`${first.courierCode}|${first.serviceCode}`);
        }
      })
      .finally(() => setLoadingRates(false));
  }

  function handleCreateShipment(e: React.FormEvent) {
    e.preventDefault();
    if (!returnData || !order) return;
    const items = selectedItems();
    if (items.length === 0) {
      toast.error("Pilih minimal satu item.");
      return;
    }

    const postalCode = destinationPostal();
    if (postalCode == null) {
      toast.error("Kode pos tujuan tidak valid pada pesanan ini.");
      return;
    }

    const picked = options?.find((o) => `${o.courierCode}|${o.serviceCode}` === selectedKey);
    if (!picked) {
      toast.error("Pilih metode pengiriman terlebih dahulu.");
      return;
    }

    startTransition(async () => {
      const { error } = await createReplacementShipment({
        returnId: returnData.id,
        complaintId,
        orderId: order.id,
        items,
        destinationName: order.shipping_name,
        destinationPhone: order.shipping_phone,
        destinationAddress: order.shipping_address,
        destinationPostalCode: postalCode,
        courierCompany: picked.courierCode,
        courierType: picked.serviceCode,
        userId,
      });
      if (error) toast.error(error);
      else toast.success("Shipment Biteship berhasil dibuat.");
    });
  }

  return (
    <div className="space-y-4">
      {complaintStatus === "in_review" && !returnData && (
        <Button type="button" variant="primary" size="sm" onClick={handleApprove} loading={pending}>
          Setujui Retur
        </Button>
      )}

      {returnData && (
        <div className="space-y-3 text-[14px]">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase">Status retur</p>
          <p className="font-medium capitalize">{returnData.status.replace(/_/g, " ")}</p>

          {returnData.return_awb && (
            <div className="space-y-1 rounded-lg bg-muted/50 p-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                Resi dari pembeli
              </p>
              <p>{returnData.return_courier}</p>
              <p className="font-mono font-semibold">{returnData.return_awb}</p>
              {returnData.proof_images.length > 0 && (
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {returnData.proof_images.map((url, i) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative aspect-square overflow-hidden rounded-lg border border-[#e0e0e0]"
                    >
                      <Image
                        src={url}
                        alt={`Bukti kirim ${i + 1}`}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {returnData.status === "shipped_back" && (
            <Button
              type="button"
              variant="pearl"
              size="sm"
              onClick={handleConfirmReceived}
              loading={pending}
            >
              Konfirmasi Terima Barang
            </Button>
          )}

          {returnData.status === "received" && order && (
            <form
              onSubmit={handleCreateShipment}
              className="space-y-4 rounded-lg border border-[#e0e0e0] p-4"
            >
              <p className="font-semibold">Buat Shipment Penggantian</p>
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                  Item yang diganti
                </p>
                {order.order_items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={itemSelected[i] ?? true}
                      onChange={(e) => setItemSelected((p) => ({ ...p, [i]: e.target.checked }))}
                    />
                    <span className="flex-1 text-[13px]">{item.product_name}</span>
                    <input
                      type="number"
                      min={1}
                      max={item.quantity}
                      value={itemQtys[i] ?? item.quantity}
                      onChange={(e) => setItemQtys((p) => ({ ...p, [i]: Number(e.target.value) }))}
                      className="w-16 rounded border border-[#e0e0e0] px-2 py-1 text-[13px]"
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                    Metode pengiriman
                  </p>
                  <Button
                    type="button"
                    variant="pearl"
                    size="sm"
                    onClick={handleCheckRates}
                    loading={loadingRates}
                  >
                    {options ? "Muat ulang ongkir" : "Cek ongkir"}
                  </Button>
                </div>

                {options === null ? (
                  <p className="text-[13px] text-muted-foreground">
                    Klik “Cek ongkir” untuk melihat kurir yang tersedia ke alamat pembeli.
                  </p>
                ) : options.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground">
                    Tidak ada layanan pengiriman untuk rute ini.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {options.map((opt) => {
                      const key = `${opt.courierCode}|${opt.serviceCode}`;
                      return (
                        <label
                          key={key}
                          className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#e0e0e0] px-3 py-2 text-[13px] has-checked:border-brand has-checked:bg-brand/5"
                        >
                          <input
                            type="radio"
                            name="replacement-shipping"
                            value={key}
                            checked={selectedKey === key}
                            onChange={() => setSelectedKey(key)}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="font-medium">
                              {opt.courierName} — {opt.serviceName}
                            </span>
                            <span className="block text-[12px] text-muted-foreground">
                              {opt.etd}
                            </span>
                          </span>
                          <span className="shrink-0 font-semibold tabular-nums">
                            {formatRupiah(opt.price)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={pending}
                disabled={!selectedKey}
              >
                Buat Shipment Biteship
              </Button>
            </form>
          )}

          {returnData.return_shipments.length > 0 && (
            <div className="space-y-1 rounded-lg border border-[#e0e0e0] p-3 text-[13px]">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase">
                Pengiriman penggantian
              </p>
              <p>{returnData.return_shipments[0].courier}</p>
              <p className="font-mono font-semibold">{returnData.return_shipments[0].awb_number}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
