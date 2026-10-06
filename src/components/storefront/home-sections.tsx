import { BadgeCheck, ShieldCheck, Star, Truck } from "lucide-react";
import Link from "next/link";

import { Marquee } from "@/components/magicui/marquee";
import type { PublicReview } from "@/server/queries/catalog";
import type { BrandSummary, CategoryNode, StoreStats } from "@/server/queries/reference";

import { StatsTicker } from "./stats-ticker";

/** Chip kategori scroll horizontal (§5 no. 2). */
export function CategoryChips({ tree }: { tree: CategoryNode[] }) {
  const chips = tree
    .filter((r) => r.slug !== "belum-dikategorikan")
    .flatMap((r) => [
      { slug: r.slug, name: r.name, strong: true },
      ...r.children.map((c) => ({ slug: c.slug, name: c.name, strong: false })),
    ]);
  return (
    <nav aria-label="Kategori" className="border-b border-border">
      <ul className="nzo-container scrollbar-none flex gap-2 overflow-x-auto py-4">
        {chips.map((c) => (
          <li key={c.slug} className="shrink-0">
            <Link
              href={`/categories/${c.slug}`}
              className={
                c.strong
                  ? "inline-flex h-10 items-center rounded-full bg-foreground px-4 text-sm font-semibold text-background"
                  : "inline-flex h-10 items-center rounded-full border border-border px-4 text-sm transition-colors hover:border-foreground"
              }
            >
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Belanja per brand: wordmark teks berjalan (logo brand menyusul). */
export function BrandMarquee({ brands }: { brands: BrandSummary[] }) {
  const top = [...brands].sort((a, b) => b.productCount - a.productCount).slice(0, 24);
  if (top.length < 4) return null;
  return (
    <section aria-labelledby="belanja-brand" className="py-12 md:py-16">
      <div className="nzo-container mb-6 flex items-end justify-between gap-4">
        <h2 id="belanja-brand" className="text-2xl md:text-[1.75rem]">
          Belanja per brand
        </h2>
        <Link href="/brands" className="text-sm font-semibold underline-offset-4 hover:underline">
          Semua brand
        </Link>
      </div>
      <Marquee pauseOnHover className="[--duration:60s] [--gap:0.75rem]">
        {top.map((b) => (
          <Link
            key={b.slug}
            href={`/brands/${b.slug}`}
            className="flex h-16 items-center rounded-lg border border-border px-6 text-lg font-bold tracking-[-0.01em] whitespace-nowrap transition-colors hover:border-foreground"
          >
            {b.name}
          </Link>
        ))}
      </Marquee>
    </section>
  );
}

/** Statistik nyata + strip kepercayaan (§5 no. 7). */
export function StoreStatsSection({ stats }: { stats: StoreStats }) {
  return (
    <section aria-label="Tentang toko" className="border-y border-border bg-steel-50">
      <div className="nzo-container grid gap-8 py-12 md:grid-cols-[1.2fr_1fr] md:py-16">
        <dl className="grid grid-cols-3 gap-4">
          <StatsTicker value={stats.products} label="Part tersedia" />
          <StatsTicker value={stats.brands} label="Brand" />
          <StatsTicker value={stats.vehicleModels} label="Model kendaraan" />
        </dl>
        <ul className="grid gap-4 text-sm sm:grid-cols-3 md:grid-cols-1">
          <li className="flex items-center gap-3">
            <BadgeCheck className="size-6 shrink-0" strokeWidth={1.75} aria-hidden />
            Produk original dan genuine parts pabrikan
          </li>
          <li className="flex items-center gap-3">
            <ShieldCheck className="size-6 shrink-0" strokeWidth={1.75} aria-hidden />
            Cek kecocokan dengan kendaraanmu sebelum membeli
          </li>
          <li className="flex items-center gap-3">
            <Truck className="size-6 shrink-0" strokeWidth={1.75} aria-hidden />
            Dikirim ke seluruh Indonesia
          </li>
        </ul>
      </div>
    </section>
  );
}

const dateFormat = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeZone: "Asia/Jakarta",
});

/** Ulasan pelanggan terbaru (hanya bila ada ulasan yang dipublikasikan). */
export function ReviewsSection({ reviews }: { reviews: PublicReview[] }) {
  if (!reviews.length) return null;
  return (
    <section aria-labelledby="ulasan" className="nzo-container py-12 md:py-16">
      <h2 id="ulasan" className="mb-6 text-2xl md:text-[1.75rem]">
        Kata pembeli
      </h2>
      <ul className="grid gap-4 md:grid-cols-3">
        {reviews.slice(0, 6).map((r) => (
          <li key={r.id} className="flex flex-col gap-3 rounded-xl border border-border p-5">
            <span className="flex" aria-label={`Rating ${r.rating} dari 5`}>
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  className={
                    i < r.rating ? "size-4 fill-rating text-rating" : "size-4 text-steel-200"
                  }
                  aria-hidden
                />
              ))}
            </span>
            {r.comment ? <p className="line-clamp-4">{r.comment}</p> : null}
            <p className="mt-auto text-sm text-muted-foreground">
              {r.reviewer} · {dateFormat.format(new Date(r.createdAt))} ·{" "}
              <Link
                href={`/products/${r.productSlug}`}
                className="underline-offset-4 hover:underline"
              >
                {r.productName}
              </Link>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
