import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PackageSearch } from "lucide-react";

import { FitmentBadge } from "@/components/catalog/fitment-badge";
import { Price } from "@/components/catalog/price";
import { ProductCard, type CatalogProductCard } from "@/components/catalog/product-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { ProductCardSkeleton } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

import { AddToCartIcon, DesignInteractive } from "./design-interactive";

export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const SWATCHES = [
  { name: "brand-black", hex: "#000000", text: "#FFFFFF" },
  { name: "white", hex: "#FFFFFF", text: "#000000" },
  { name: "asphalt", hex: "#1E1F22", text: "#FFFFFF" },
  { name: "steel-50", hex: "#F4F5F6", text: "#000000" },
  { name: "steel-200", hex: "#E3E5E8", text: "#000000" },
  { name: "steel-500", hex: "#6B7079", text: "#FFFFFF" },
  { name: "steel-700", hex: "#3A3D42", text: "#FFFFFF" },
  { name: "signal", hex: "#FFB300", text: "#000000" },
  { name: "signal-soft", hex: "#FFF4D6", text: "#000000" },
  { name: "success", hex: "#1C7F46", text: "#FFFFFF" },
  { name: "danger", hex: "#D92D20", text: "#FFFFFF" },
  { name: "warning", hex: "#B54708", text: "#FFFFFF" },
];

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

async function fetchDemoProducts(): Promise<CatalogProductCard[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(
      "slug, name, price, compare_at_price, stock, average_rating, review_count, total_sold, brands(name)",
    )
    .order("published_at", { ascending: false })
    .limit(4);
  return (data ?? []).map((p, i) => {
    const brand = Array.isArray(p.brands) ? p.brands[0] : p.brands;
    return {
      slug: p.slug,
      name: p.name,
      brandName: brand?.name ?? null,
      price: p.price,
      compareAtPrice: p.compare_at_price,
      // contoh variasi state untuk preview
      stock: i === 3 ? 0 : p.stock,
      averageRating: i === 0 ? 4.8 : Number(p.average_rating),
      reviewCount: i === 0 ? 37 : p.review_count,
      totalSold: i === 0 ? 1240 : p.total_sold,
      fits: i === 1,
    };
  });
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border py-12">
      <h2 className="mb-6">{title}</h2>
      {children}
    </section>
  );
}

/** Pratinjau token & komponen (design-system.md). Hanya di development. */
export default async function DesignPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const products = await fetchDemoProducts();

  return (
    <main className="nzo-container py-12">
      <PageHeader
        title="Design system NZO"
        description="Pratinjau token dan komponen dari design-system.md. Halaman ini tidak tersedia di production."
        actions={<Button variant="secondary">Aksi sekunder</Button>}
      />

      <Section title="Warna">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {SWATCHES.map((s) => (
            <li key={s.name} className="overflow-hidden rounded-lg border border-border">
              <div className="flex h-20 items-end p-3" style={{ background: s.hex, color: s.text }}>
                <span className="text-caption font-semibold">
                  Aa {contrast(s.hex, s.text).toFixed(1)}:1
                </span>
              </div>
              <div className="p-3">
                <p className="text-sm font-medium">{s.name}</p>
                <p className="text-caption text-muted-foreground uppercase tabular-nums">{s.hex}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">
          Teks steel-500 di putih: {contrast("#6B7079", "#FFFFFF").toFixed(2)}:1. Signal hanya
          sebagai fill dengan teks hitam ({contrast("#FFB300", "#000000").toFixed(1)}:1), tidak
          pernah sebagai teks di putih ({contrast("#FFB300", "#FFFFFF").toFixed(1)}:1).
        </p>
      </Section>

      <Section title="Tipografi (Outfit)">
        <div className="flex flex-col gap-4">
          <p className="text-display">Part yang pas untuk kendaraanmu</p>
          <h1>Judul halaman h1</h1>
          <h2>Judul section h2</h2>
          <h3>Nama produk h3</h3>
          <h4>Sub-judul h4</h4>
          <p className="max-w-prose">
            Body 16/26. Kampas rem depan untuk motor matic, bahan semi-metallic, cocok untuk
            pemakaian harian di jalan perkotaan.
          </p>
          <p className="text-sm text-muted-foreground">
            Body kecil 14/22 untuk teks sekunder dan tabel admin.
          </p>
          <p className="text-caption text-muted-foreground">Caption 12/16, metadata</p>
          <Price price={250000} compareAt={299000} size="pdp" showSaving />
        </div>
      </Section>

      <Section title="Tombol">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Tambah ke keranjang</Button>
          <Button variant="secondary">Simpan perubahan</Button>
          <Button variant="signal">Lihat flash sale</Button>
          <Button variant="ghost">Batal</Button>
          <Button variant="destructive">Hapus produk</Button>
          <Button variant="link">Lihat semua</Button>
          <Button loading>Menyimpan</Button>
          <Button disabled>Nonaktif</Button>
          <Button size="sm">Kecil</Button>
          <Button size="lg">Besar</Button>
        </div>
      </Section>

      <Section title="Form, toggle, toast, konfirmasi">
        <DesignInteractive />
      </Section>

      <Section title="Badge kecocokan & status">
        <div className="flex flex-wrap items-center gap-3">
          <FitmentBadge />
          <FitmentBadge vehicle="Honda Vario 125 2022" />
          <FitmentBadge vehicle="Toyota Avanza 2019" size="lg" />
          <span className="rounded-sm bg-signal px-1.5 py-0.5 text-caption font-semibold text-brand-black">
            -16%
          </span>
          <span className="rounded-sm bg-danger px-1.5 py-0.5 text-caption font-semibold text-white">
            Stok habis
          </span>
        </div>
      </Section>

      <Section title="Kartu produk (data seed)">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-5">
          {products.map((p) => (
            <ProductCard key={p.slug} product={p} action={<AddToCartIcon />} />
          ))}
          <ProductCardSkeleton />
        </div>
      </Section>

      <Section title="Empty state">
        <EmptyState
          icon={PackageSearch}
          title="Belum ada part untuk kendaraan ini"
          description="Coba hapus filter tahun, atau lihat semua part untuk merek yang sama."
          action={{ label: "Lihat semua part", href: "/products" }}
        />
      </Section>
    </main>
  );
}
