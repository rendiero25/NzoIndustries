import { FileText, Printer, TriangleAlert } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/** Tombol dokumen pesanan (invoice A4, resi A5). PDF dibuka di tab baru. */
export function OrderDocuments({
  orderNumber,
  invoiceNumber,
  canPrintLabel,
  shipperIncomplete,
}: {
  orderNumber: string;
  invoiceNumber: string | null;
  canPrintLabel: boolean;
  shipperIncomplete: boolean;
}) {
  if (!invoiceNumber && !canPrintLabel) return null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {invoiceNumber ? (
          <Button asChild variant="outline" size="sm">
            <a href={`/admin/orders/${orderNumber}/invoice`} target="_blank" rel="noopener">
              <FileText /> Invoice <span className="font-mono text-caption">{invoiceNumber}</span>
            </a>
          </Button>
        ) : null}
        {canPrintLabel ? (
          <Button asChild variant="outline" size="sm">
            <a href={`/admin/orders/labels?numbers=${orderNumber}`} target="_blank" rel="noopener">
              <Printer /> Cetak resi
            </a>
          </Button>
        ) : null}
      </div>
      {canPrintLabel && shipperIncomplete ? (
        <p className="flex items-center gap-2 text-caption text-muted-foreground">
          <TriangleAlert className="size-4 text-warning" aria-hidden />
          Data pengirim di resi belum lengkap.
          <Link href="/admin/settings" className="underline underline-offset-4">
            Lengkapi di Pengaturan
          </Link>
        </p>
      ) : null}
    </div>
  );
}
