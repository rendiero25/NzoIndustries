import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { EditFlashSaleButton, FlashSaleItems } from "@/components/admin/promo/flash-sale-forms";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/guards";
import { saleState } from "@/lib/promo/status";
import { getAdminFlashSale } from "@/server/queries/admin/promo";

export const metadata: Metadata = { title: "Kelola flash sale" };
export const dynamic = "force-dynamic";

const dt = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function AdminFlashSalePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["owner", "admin"]);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const data = await getAdminFlashSale(id);
  if (!data) notFound();
  const { sale, items } = data;
  // eslint-disable-next-line react-hooks/purity -- status event dihitung per request
  const state = saleState(sale, Date.now());

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/flash-sales"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden /> Semua flash sale
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="flex flex-wrap items-center gap-3 text-2xl font-bold">
            {sale.name} <Badge variant={state.variant}>{state.label}</Badge>
          </h1>
          <p className="text-sm text-muted-foreground">
            {dt.format(new Date(sale.startsAt))} – {dt.format(new Date(sale.endsAt))} WIB
            {sale.subtitle ? ` · ${sale.subtitle}` : ""}
          </p>
        </div>
        <EditFlashSaleButton sale={sale} />
      </div>
      <FlashSaleItems flashSaleId={sale.id} items={items} />
    </div>
  );
}
