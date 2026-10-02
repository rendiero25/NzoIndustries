import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/legacy/server";
import { BITESHIP_COURIER_BRANDS } from "@/lib/biteship/courier-brands";
import { LEGAL_ENTITY_NAME } from "@/lib/constants/business-identity";
import { formatDate, formatRupiah } from "@/lib/format";
import { Code128Barcode } from "@/components/shared/code128-barcode";
import { SiteLogo } from "@/components/shared/site-logo";
import { PrintPageButton } from "@/components/admin/print-page-button";

export const metadata: Metadata = { title: "Cetak Resi — Admin NZO Industries" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

function formatWeight(grams: number): string {
  if (grams < 1000) return `${grams} gram`;
  return `${(grams / 1000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} kg`;
}

/** "1 - 2 days" / "2-3 hari" → "1 - 2 hari" (courier_etd dari Biteship kadang sudah bersatuan). */
function formatEtd(etd: string): string {
  return `${etd.replace(/\s*(days?|hari)\s*$/i, "").trim()} hari`;
}

function appHost(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL ?? "").host;
  } catch {
    return "";
  }
}

export default async function ShippingLabelPage({ params }: Props) {
  const { id } = await params;
  // Session client: RLS is_admin() membatasi baca order ke admin (proxy juga menjaga /admin/*).
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select(
      `id, order_number, created_at, recipient_name, recipient_phone, shipping_address,
       shipping_district, shipping_city, shipping_province, shipping_postal, shipping_cost,
       shipping_insurance, courier_company, courier_service, courier_etd, notes,
       order_items(id, product_name, variant_name, sku, quantity, weight),
       shipments(awb, biteship_order_id, courier_company, courier_service)`,
    )
    .eq("id", id)
    .maybeSingle();

  if (!order) notFound();

  const shipment = Array.isArray(order.shipments) ? order.shipments[0] : order.shipments;
  const items = order.order_items ?? [];
  const awb = shipment?.awb ?? null;

  const courierCode = (shipment?.courier_company ?? order.courier_company ?? "").toLowerCase();
  const courierService = (shipment?.courier_service ?? order.courier_service ?? "").toUpperCase();
  const brand = BITESHIP_COURIER_BRANDS.find((b) => b.code === courierCode);
  const courierName = brand?.name ?? courierCode.toUpperCase();

  const totalQty = items.reduce((sum, it) => sum + it.quantity, 0);
  const totalWeight = items.reduce((sum, it) => sum + it.weight * it.quantity, 0);
  const hasInsurance = Number(order.shipping_insurance) > 0;

  const shipper = {
    name: process.env.BITESHIP_SHIPPER_NAME?.trim() || "NZO Industries",
    phone: process.env.BITESHIP_SHIPPER_PHONE?.trim() || "",
    address: process.env.BITESHIP_ORIGIN_ADDRESS?.trim() || "",
    postal:
      (process.env.BITESHIP_ORIGIN_POSTAL_CODE ?? process.env.BITESHIP_ORIGIN_POSTAL)?.trim() || "",
  };
  const csWhatsApp = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
  const host = appHost();

  return (
    <div className="min-h-screen bg-muted py-8 print:min-h-0 print:bg-white print:py-0">
      {/* Ukuran kertas A5 hanya bisa diatur lewat @page — tidak ada padanan className. */}
      <style>{"@page { size: A5 portrait; margin: 0; }"}</style>

      <div className="mx-auto mb-4 flex w-[148mm] max-w-full items-center justify-between gap-3 px-4 sm:px-0 print:hidden">
        <Link
          href={`/admin/orders/${order.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-steel-700 hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Kembali ke pesanan
        </Link>
        <PrintPageButton label="Cetak Resi (A5)" />
      </div>

      {!awb && (
        <p className="mx-auto mb-4 w-[148mm] max-w-full rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 print:hidden">
          Nomor resi belum terbit. Konfirmasi siap pickup atau sinkron Biteship dulu sebelum
          mencetak.
        </p>
      )}

      {/* ── Lembar A5 ─────────────────────────────────────────────── */}
      {/* Tinggi cetak sedikit di bawah 210mm supaya pembulatan printer tidak memunculkan halaman kosong kedua. */}
      <article className="mx-auto flex h-[210mm] w-[148mm] flex-col overflow-hidden bg-white p-[6mm] text-[10px] leading-snug text-black shadow-[0_2px_12px_rgba(0,0,0,0.12)] print:h-[209mm] print:shadow-none">
        {/* Header: toko + kurir */}
        <header className="flex items-center justify-between gap-3 border-b-2 border-black pb-2">
          <div>
            <SiteLogo variant="shippingLabel" asStatic />
            <p className="mt-1 text-[8px] text-[#333]">{LEGAL_ENTITY_NAME}</p>
          </div>
          <div className="flex items-center gap-2 text-right">
            {brand?.logo && (
              <div className="relative h-9 w-16">
                <Image
                  src={brand.logo}
                  alt={courierName}
                  fill
                  className="object-contain"
                  sizes="64px"
                />
              </div>
            )}
            <div>
              <p className="text-[15px] leading-tight font-bold uppercase">{courierName}</p>
              <p className="text-[11px] font-semibold uppercase">{courierService}</p>
            </div>
          </div>
        </header>

        {/* Badge layanan */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="rounded-sm bg-black px-2 py-0.5 text-[11px] font-bold tracking-wide text-white uppercase">
            Non-COD
          </span>
          <span className="rounded-sm border border-black px-2 py-0.5 text-[10px] font-semibold uppercase">
            {hasInsurance ? "Diasuransikan" : "Tanpa asuransi"}
          </span>
          {order.courier_etd && (
            <span className="rounded-sm border border-black px-2 py-0.5 text-[10px] font-semibold uppercase">
              Estimasi {formatEtd(order.courier_etd)}
            </span>
          )}
        </div>

        {/* AWB */}
        <section className="mt-2 rounded-sm border-2 border-black px-3 py-2 text-center">
          <p className="text-[9px] font-semibold tracking-[0.12em] uppercase">Nomor Resi / AWB</p>
          {awb ? (
            <>
              <Code128Barcode value={awb} barHeight={40} className="mx-auto mt-1 h-[20mm] w-full" />
              <p className="mt-1 font-mono text-base font-bold tracking-wider">{awb}</p>
            </>
          ) : (
            <p className="py-5 text-[13px] font-bold uppercase">Resi belum terbit</p>
          )}
        </section>

        {/* Penerima & pengirim */}
        <section className="mt-2 grid grid-cols-[3fr_2fr] border-2 border-black">
          <div className="border-r-2 border-black p-2.5">
            <p className="text-[9px] font-bold tracking-[0.12em] uppercase">Penerima</p>
            <p className="mt-1 text-[14px] leading-tight font-bold">{order.recipient_name}</p>
            <p className="mt-0.5 text-[11px] font-semibold">{order.recipient_phone}</p>
            <p className="mt-1.5 text-[10.5px]">{order.shipping_address}</p>
            <p className="text-[10.5px]">
              Kec. {order.shipping_district}, {order.shipping_city}
            </p>
            <p className="text-[10.5px] font-semibold uppercase">
              {order.shipping_province} {order.shipping_postal}
            </p>
          </div>
          <div className="p-2.5">
            <p className="text-[9px] font-bold tracking-[0.12em] uppercase">Pengirim</p>
            <p className="mt-1 text-[12px] leading-tight font-bold">{shipper.name}</p>
            {shipper.phone && <p className="mt-0.5 text-[10px] font-semibold">{shipper.phone}</p>}
            {shipper.address && <p className="mt-1.5 text-[9.5px]">{shipper.address}</p>}
            {shipper.postal && <p className="text-[9.5px] font-semibold">{shipper.postal}</p>}
          </div>
        </section>

        {/* Detail pesanan */}
        <section className="mt-2 grid grid-cols-[auto_1fr] items-center gap-x-3 border-2 border-black p-2">
          <Code128Barcode value={order.order_number} barHeight={30} className="h-[11mm] w-[46mm]" />
          <dl className="grid grid-cols-3 gap-x-2 gap-y-1">
            <div className="col-span-3">
              <dt className="text-[8px] text-[#444] uppercase">No. Pesanan</dt>
              <dd className="font-mono text-[11px] font-bold">{order.order_number}</dd>
            </div>
            <div>
              <dt className="text-[8px] text-[#444] uppercase">Tgl. Pesan</dt>
              <dd className="font-semibold">{formatDate(order.created_at)}</dd>
            </div>
            <div>
              <dt className="text-[8px] text-[#444] uppercase">Berat</dt>
              <dd className="font-semibold">{formatWeight(totalWeight)}</dd>
            </div>
            <div>
              <dt className="text-[8px] text-[#444] uppercase">Ongkir</dt>
              <dd className="font-semibold">{formatRupiah(Number(order.shipping_cost))}</dd>
            </div>
          </dl>
        </section>

        {/* Isi paket */}
        <section className="mt-2 flex min-h-0 flex-1 flex-col border-2 border-black">
          <div className="flex items-center justify-between border-b border-black bg-black px-2 py-1 text-white">
            <p className="text-[9px] font-bold tracking-[0.12em] uppercase">Isi Paket</p>
            <p className="text-[9px] font-semibold">
              {items.length} produk · {totalQty} pcs
            </p>
          </div>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-black text-[8px] uppercase">
                <th className="w-6 px-2 py-1 font-semibold">No</th>
                <th className="px-2 py-1 font-semibold">Produk</th>
                <th className="px-2 py-1 font-semibold">SKU</th>
                <th className="w-10 px-2 py-1 text-right font-semibold">Qty</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr
                  key={it.id}
                  className="border-b border-dashed border-[#999] align-top last:border-b-0"
                >
                  <td className="px-2 py-1">{i + 1}</td>
                  <td className="px-2 py-1">
                    <p className="line-clamp-2 font-semibold">{it.product_name}</p>
                    {it.variant_name && <p className="text-[9px] text-[#333]">{it.variant_name}</p>}
                  </td>
                  <td className="px-2 py-1 font-mono text-[9px]">{it.sku}</td>
                  <td className="px-2 py-1 text-right text-[11px] font-bold">{it.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {order.notes && (
            <div className="mt-auto border-t border-black px-2 py-1.5">
              <p className="text-[8px] font-bold uppercase">Catatan Pembeli</p>
              <p className="line-clamp-3 text-[10px]">{order.notes}</p>
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="mt-2 flex items-end justify-between gap-3 border-t-2 border-black pt-1.5 text-[8.5px]">
          <div>
            <p className="font-semibold">Terima kasih telah berbelanja di NZO Industries!</p>
            <p className="text-[#333]">
              Rekam video saat membuka paket sebagai bukti bila ada kendala / klaim.
            </p>
          </div>
          <div className="shrink-0 text-right">
            {host && <p className="font-semibold">{host}</p>}
            {csWhatsApp && <p>CS WhatsApp: +{csWhatsApp}</p>}
            {shipment?.biteship_order_id && (
              <p className="font-mono text-[7px] text-[#555]">Ref: {shipment.biteship_order_id}</p>
            )}
          </div>
        </footer>
      </article>
    </div>
  );
}
