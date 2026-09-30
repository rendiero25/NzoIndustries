import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { FlashSaleForm } from "../_components/flash-sale-form-client";
import { FlashSaleBannersSection } from "../_components/flash-sale-banners-section";
import {
  FlashSaleProducts,
  type FlashSaleProductRow,
  type VariantOption,
} from "./_components/flash-sale-products";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("flash_sales").select("name").eq("id", id).single();
  return { title: `${data?.name ?? "Flash Sale"} — Admin NZO Industries` };
}

function getStatusInfo(sale: { is_active: boolean; starts_at: string; ends_at: string }): {
  label: string;
  className: string;
} {
  const now = new Date();
  const starts = new Date(sale.starts_at);
  const ends = new Date(sale.ends_at);

  if (!sale.is_active) {
    return { label: "Nonaktif", className: "bg-muted text-foreground" };
  }
  if (now < starts) {
    return { label: "Terjadwal", className: "bg-brand/10 text-brand" };
  }
  if (now >= starts && now <= ends) {
    return {
      label: "Berlangsung",
      className: "bg-emerald-500/15 text-emerald-800",
    };
  }
  return { label: "Berakhir", className: "bg-muted text-foreground" };
}

export default async function AdminFlashSaleDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: sale } = await supabase
    .from("flash_sales")
    .select("id, name, subtitle, starts_at, ends_at, is_active, created_at")
    .eq("id", id)
    .single();

  if (!sale) notFound();

  const { data: fspData } = await supabase
    .from("flash_sale_products")
    .select(
      `id, variant_id, sale_price, quota, sold,
       product_variants:variant_id (
         name, sku, price,
         products:product_id (name, slug)
       )`,
    )
    .eq("flash_sale_id", id)
    .order("sale_price", { ascending: true });

  const existingVariantIds = (fspData ?? []).map((r) => r.variant_id);

  const { data: allVariants } = await supabase
    .from("product_variants")
    .select(`id, name, sku, price, products:product_id (name)`)
    .eq("is_active", true)
    .order("price", { ascending: true });

  const availableVariants: VariantOption[] = (allVariants ?? [])
    .filter((v) => !existingVariantIds.includes(v.id))
    .map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      price: v.price,
      product_name: Array.isArray(v.products)
        ? (v.products[0]?.name ?? "—")
        : ((v.products as { name: string } | null)?.name ?? "—"),
    }));

  const statusInfo = getStatusInfo(sale);

  return (
    <div className="w-full space-y-8 p-6 lg:p-8">
      <Link
        href="/admin/promotions/flash-sale"
        className="admin-text-link inline-flex items-center gap-1.5 text-xs font-medium"
      >
        <ArrowLeft size={13} />
        Kembali ke daftar flash sale
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-swiss-eyebrow">Promosi</p>
          <h1 className="text-[34px] font-semibold text-foreground uppercase">{sale.name}</h1>
          <p className="mt-1 text-[17px] leading-[1.47] text-foreground">
            {formatDate(sale.starts_at)} — {formatDate(sale.ends_at)}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-semibold uppercase",
            statusInfo.className,
          )}
        >
          {statusInfo.label}
        </span>
      </div>

      <div className="flex flex-col gap-6">
        <div className="admin-utility-card space-y-0 p-6">
          <FlashSaleForm
            initialData={sale}
            redirectTo={`/admin/promotions/flash-sale/${id}`}
            bannerSection={<FlashSaleBannersSection flashSaleId={id} />}
          />
        </div>

        <FlashSaleProducts
          flashSaleId={id}
          products={(fspData ?? []) as FlashSaleProductRow[]}
          availableVariants={availableVariants}
        />
      </div>
    </div>
  );
}
