import { ArrowLeft, FileVideo } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { StatusBadge } from "@/components/account/status-badge";
import { AfterSalesStatusForm } from "@/components/admin/service/service-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/guards";
import { CLAIM_STATUS_META, RETURN_STATUS_META } from "@/lib/orders/status";
import { getAdminAfterSales } from "@/server/queries/admin/service";

export const metadata: Metadata = { title: "Detail retur & garansi" };
export const dynamic = "force-dynamic";

const date = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function AdminAfterSalesPage({
  params,
}: {
  params: Promise<{ kind: string; id: string }>;
}) {
  await requireRole(["owner", "admin", "cs"]);
  const { kind, id } = await params;
  if ((kind !== "return" && kind !== "claim") || !z.uuid().safeParse(id).success) notFound();
  const item = await getAdminAfterSales(kind, id);
  if (!item) notFound();
  const meta =
    (kind === "return" ? RETURN_STATUS_META : CLAIM_STATUS_META)[item.status] ??
    ({ label: item.status, tone: "neutral" } as const);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/returns"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden /> Semua retur & garansi
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">
            {kind === "return" ? "Retur" : "Klaim garansi"}: {item.productName ?? "Seluruh pesanan"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Diajukan {date.format(new Date(item.createdAt))} oleh{" "}
            <Link
              href={`/admin/customers/${item.customerId}`}
              className="underline underline-offset-4"
            >
              {item.customer}
            </Link>
            {item.orderNumber ? (
              <>
                {" "}
                · pesanan{" "}
                <Link
                  href={`/admin/orders/${item.orderNumber}`}
                  className="font-mono underline underline-offset-4"
                >
                  {item.orderNumber}
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <StatusBadge label={meta.label} tone={meta.tone} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pengajuan pelanggan</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              {item.reason ? (
                <div>
                  <span className="text-caption text-muted-foreground">Alasan</span>
                  <p className="font-medium">{item.reason}</p>
                </div>
              ) : null}
              <div>
                <span className="text-caption text-muted-foreground">Keterangan</span>
                <p className="whitespace-pre-line">{item.description || "-"}</p>
              </div>
              {item.returnAwb ? (
                <div>
                  <span className="text-caption text-muted-foreground">Resi kirim balik</span>
                  <p className="font-mono">{item.returnAwb}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Foto & video ({item.media.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {item.media.length === 0 ? (
                <p className="text-sm text-muted-foreground">Tidak ada lampiran.</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {item.media.map((m) =>
                    !m.url ? (
                      <span key={m.path} className="text-sm text-danger">
                        Lampiran tidak bisa dimuat.
                      </span>
                    ) : m.isVideo ? (
                      <a
                        key={m.path}
                        href={m.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex size-28 flex-col items-center justify-center gap-1 rounded-md border border-border text-sm text-muted-foreground hover:bg-muted"
                      >
                        <FileVideo className="size-6" aria-hidden /> Video
                      </a>
                    ) : (
                      <a key={m.path} href={m.url} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element -- signed URL privat berumur 5 menit */}
                        <img
                          src={m.url}
                          alt="Lampiran pelanggan"
                          className="size-28 rounded-md border border-border object-cover"
                        />
                      </a>
                    ),
                  )}
                </div>
              )}
              <p className="mt-3 text-caption text-muted-foreground">
                Tautan lampiran berlaku 5 menit. Muat ulang halaman bila kedaluwarsa.
              </p>
            </CardContent>
          </Card>
          {item.adminNote || item.resolution ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tanggapan toko</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                {item.adminNote ? (
                  <div>
                    <span className="text-caption text-muted-foreground">Catatan</span>
                    <p className="whitespace-pre-line">{item.adminNote}</p>
                  </div>
                ) : null}
                {item.resolution ? (
                  <div>
                    <span className="text-caption text-muted-foreground">Resolusi</span>
                    <p className="whitespace-pre-line">{item.resolution}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>
        <AfterSalesStatusForm
          key={item.status}
          kind={kind}
          id={item.id}
          status={item.status}
          adminNote={item.adminNote}
          resolution={item.resolution}
        />
      </div>
    </div>
  );
}
