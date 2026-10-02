import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Video } from "lucide-react";

import { createClient } from "@/lib/supabase/legacy/server";
import { fetchOrderDetailForUser } from "@/lib/data/dashboard-user";
import { fetchComplaintForOrder } from "@/lib/data/complaints";
import { OrderComplaintForm } from "@/components/dashboard/order-complaint-form";
import { ComplaintThread } from "@/components/dashboard/complaint-thread";
import { ReturnAwbForm } from "@/components/dashboard/return-awb-form";
import { getStoreOrigin } from "@/lib/settings/queries";
import { getStoreOriginFullAddress } from "@/lib/settings/store-origin";

const CATEGORY_LABELS: Record<string, string> = {
  wrong_item: "Barang tidak sesuai pesanan",
  damaged: "Barang rusak / cacat",
  missing_item: "Barang kurang / tidak lengkap",
  not_as_described: "Tidak sesuai deskripsi",
  other: "Lainnya",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Baru",
  in_review: "Sedang Ditinjau",
  resolved: "Selesai",
  rejected: "Ditolak",
  return_approved: "Retur Disetujui",
};

const RETURN_STATUS_LABELS: Record<string, string> = {
  pending_shipback: "Menunggu pengiriman balik dari Anda",
  shipped_back: "Barang sedang dikirim ke NZO Industries",
  received: "Barang diterima, penggantian sedang disiapkan",
  replacement_sent: "Produk pengganti sedang dikirim",
  completed: "Retur selesai",
};

function isVideo(url: string) {
  return /\.(mp4|mov|webm)$/i.test(url);
}

export default async function OrderComplaintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirectTo=/dashboard/orders/${id}/complaint`);

  const detail = await fetchOrderDetailForUser(user.id, id);
  if (!detail) notFound();

  const complaint = await fetchComplaintForOrder(id);

  // No complaint yet — show form
  if (!complaint) {
    return (
      <div>
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950">
          Jelaskan masalah secara jujur. Tim NZO Industries akan menghubungi Anda melalui chat di
          halaman ini.
        </div>
        <OrderComplaintForm orderId={detail.order.id} />
      </div>
    );
  }

  const ret = complaint.return;
  const storeOrigin = await getStoreOrigin();
  const returnAddress = getStoreOriginFullAddress(storeOrigin);

  return (
    <div className="space-y-6">
      {/* Complaint detail */}
      <div className="space-y-4 rounded-xl border border-border bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Detail Komplain</h2>
          <span className="rounded-full bg-steel-200 px-3 py-1 text-[12px] font-semibold">
            {STATUS_LABELS[complaint.status] ?? complaint.status}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-[14px]">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase">
              No. Komplain
            </p>
            <p className="mt-0.5 font-mono font-semibold">{complaint.complaint_number}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase">Kategori</p>
            <p className="mt-0.5">{CATEGORY_LABELS[complaint.category] ?? complaint.category}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase">Ringkasan</p>
            <p className="mt-0.5">{complaint.reason}</p>
          </div>
        </div>
        {complaint.description && (
          <div className="text-[14px]">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase">Detail</p>
            <p className="mt-0.5 text-steel-700">{complaint.description}</p>
          </div>
        )}
        {complaint.images.length > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-semibold text-muted-foreground uppercase">
              Bukti media
            </p>
            <div className="flex flex-wrap gap-2">
              {complaint.images.map((url, i) =>
                isVideo(url) ? (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-16 w-16 items-center justify-center rounded-lg border border-border bg-muted"
                  >
                    <Video className="h-6 w-6 text-muted-foreground" />
                  </a>
                ) : (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative h-16 w-16 overflow-hidden rounded-lg border border-border"
                  >
                    <Image
                      src={url}
                      alt={`Bukti ${i + 1}`}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </a>
                ),
              )}
            </div>
          </div>
        )}
      </div>

      {/* Return approved: ship back section */}
      {complaint.status === "return_approved" && ret?.status === "pending_shipback" && (
        <div className="space-y-4 rounded-xl border border-border bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold">Kirim Barang Kembali</h2>
          <div className="rounded-lg bg-muted px-4 py-3 text-[13px] leading-relaxed text-steel-700">
            <p className="font-medium text-foreground">Alamat pengiriman:</p>
            <p className="mt-1">{returnAddress}</p>
            <p className="mt-2 text-[12px]">
              Biaya pengiriman ditanggung pembeli. Setelah mengirim, masukkan nomor resi di bawah.
            </p>
          </div>
          <ReturnAwbForm returnId={ret.id} orderId={detail.order.id} />
        </div>
      )}

      {/* Return status */}
      {ret && ret.status !== "pending_shipback" && (
        <div className="space-y-3 rounded-xl border border-border bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold">Status Retur</h2>
          <p className="text-[14px] text-steel-700">
            {RETURN_STATUS_LABELS[ret.status] ?? ret.status}
          </p>
          {ret.status === "replacement_sent" && ret.return_shipments.length > 0 && (
            <div className="rounded-lg border border-border p-3 text-[13px]">
              <p className="font-medium">
                Penggantian dikirim via {ret.return_shipments[0].courier}
              </p>
              <p className="mt-0.5 font-mono text-foreground">
                {ret.return_shipments[0].awb_number}
              </p>
              <Link
                href={`/dashboard/orders/${id}/return`}
                className="mt-2 inline-block text-[12px] underline"
              >
                Lihat detail retur →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Thread */}
      <div className="rounded-xl border border-border bg-white p-5 sm:p-6">
        <h2 className="mb-4 text-base font-semibold">Pesan ke Tim NZO Industries</h2>
        <ComplaintThread
          complaintId={complaint.id}
          messages={complaint.messages}
          currentUserId={user.id}
        />
      </div>
    </div>
  );
}
