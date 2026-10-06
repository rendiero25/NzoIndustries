import { Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ShieldMark } from "@/components/catalog/shield-mark";
import { ProductGrid } from "@/components/storefront/product-grid";
import { ProductTabs, type ProductTab } from "@/components/storefront/product-tabs";
import { ProductView, type FitResult } from "@/components/storefront/product-view";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SITE_URL } from "@/lib/constants/site";
import { getWishlistIds } from "@/server/actions/wishlist";
import {
  getProductBySlug,
  getPublicReviews,
  listProductCards,
  type ProductDetail,
} from "@/server/queries/catalog";
import { findCategory, getVehicleCatalog } from "@/server/queries/reference";
import { getActiveVehicle, type ActiveVehicle } from "@/server/queries/vehicle";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ v?: string | string[] }>;
};

const dateFormat = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeZone: "Asia/Jakarta",
});

/** Kategori utama + induknya (dari pohon kategori yang di-cache). */
async function primaryCategory(p: ProductDetail) {
  for (const c of p.categories) {
    const found = await findCategory(c.slug);
    if (found?.parent)
      return { ...c, parent: { slug: found.parent.slug, name: found.parent.name } };
  }
  const first = p.categories[0];
  return first ? { ...first, parent: null } : null;
}

function describe(p: ProductDetail): string {
  const text = p.meta_description ?? p.short_description ?? p.description ?? "";
  return (
    text || `Beli ${p.name} di NZO Industries. Cek kecocokan dengan kendaraanmu sebelum membeli.`
  ).slice(0, 160);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: "Produk tidak ditemukan" };
  return {
    title: p.meta_title ?? p.name,
    description: describe(p),
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: {
      title: p.name,
      description: describe(p),
      type: "website",
      url: `/products/${p.slug}`,
    },
  };
}

function fitFor(p: ProductDetail, vehicle: ActiveVehicle | null): FitResult {
  if (!vehicle) return null;
  const matches = p.fitments.filter(
    (f) =>
      f.model?.id === vehicle.modelId &&
      (f.year_start == null || f.year_start <= vehicle.year) &&
      (f.year_end == null || f.year_end >= vehicle.year),
  );
  const level = matches.some((f) => f.is_verified)
    ? "verified"
    : matches.length
      ? "mentioned"
      : "none";
  return { level, vehicleLabel: vehicle.label };
}

function yearRange(
  start: number | null,
  end: number | null,
  modelStart?: number,
  modelEnd?: number | null,
) {
  const s = start ?? modelStart;
  const e = end ?? modelEnd ?? null;
  if (!s) return "Semua tahun";
  return e ? (s === e ? `${s}` : `${s}–${e}`) : `${s}–sekarang`;
}

export default async function ProductPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const category = await primaryCategory(product);
  const vehicle = await getActiveVehicle();
  const [vehicles, wishlist, reviews, related] = await Promise.all([
    getVehicleCatalog(),
    getWishlistIds(),
    product.review_count > 0 ? getPublicReviews(product.id, 10) : Promise.resolve([]),
    category
      ? listProductCards(
          { sort: "bestseller", categorySlug: category.slug, limit: 8, excludeId: product.id },
          null,
        )
      : Promise.resolve([]),
  ]);

  const variantSku = Array.isArray(sp.v) ? sp.v[0] : sp.v;
  const verifiedFitments = product.fitments.filter((f) => f.is_verified);
  const mentionedFitments = product.fitments.filter((f) => !f.is_verified);

  const fitmentTable = (rows: typeof product.fitments) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Merek</TableHead>
          <TableHead>Model</TableHead>
          <TableHead>Tahun</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((f) => (
          <TableRow key={f.id}>
            <TableCell>{f.model?.make?.name}</TableCell>
            <TableCell className="font-medium">{f.model?.name}</TableCell>
            <TableCell className="tabular-nums">
              {yearRange(f.year_start, f.year_end, f.model?.year_start, f.model?.year_end)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const tabs: ProductTab[] = [
    {
      value: "deskripsi",
      label: "Deskripsi",
      content: product.description ? (
        <div className="leading-7 whitespace-pre-line">{product.description}</div>
      ) : (
        <p className="text-muted-foreground">
          Deskripsi lengkap sedang disiapkan. Cek tab Spesifikasi dan Kecocokan, atau tanyakan
          detail ke CS lewat WhatsApp.
        </p>
      ),
    },
    {
      value: "spesifikasi",
      label: "Spesifikasi",
      content: (
        <dl className="divide-y divide-border rounded-lg border border-border">
          {[
            { label: "SKU", value: product.sku },
            ...(product.brand ? [{ label: "Brand", value: product.brand.name }] : []),
            ...product.specs.map((s) => ({ label: s.label, value: s.value })),
            ...(product.weight_grams
              ? [{ label: "Berat", value: `${product.weight_grams.toLocaleString("id-ID")} gram` }]
              : []),
            ...(product.warranty_info ? [{ label: "Garansi", value: product.warranty_info }] : []),
          ].map((row) => (
            <div key={row.label} className="grid grid-cols-[10rem_1fr] gap-4 px-4 py-3 text-sm">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="font-medium break-words">{row.value}</dd>
            </div>
          ))}
        </dl>
      ),
    },
    {
      value: "kecocokan",
      label: "Kecocokan kendaraan",
      content: product.fitments.length ? (
        <div className="flex flex-col gap-8">
          {verifiedFitments.length ? (
            <div className="flex flex-col gap-3">
              <h3 className="flex items-center gap-2 text-base">
                <ShieldMark className="size-4" />
                Cocok (terverifikasi)
              </h3>
              {fitmentTable(verifiedFitments)}
            </div>
          ) : null}
          {mentionedFitments.length ? (
            <div className="flex flex-col gap-3">
              <h3 className="text-base">Disebut di deskripsi produk</h3>
              <p className="text-sm text-muted-foreground">
                Kendaraan ini disebut di nama/deskripsi produk dan belum diverifikasi tim kami.
              </p>
              {fitmentTable(mentionedFitments)}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-muted-foreground">
          Part ini belum punya data kecocokan kendaraan (biasanya produk universal). Tanyakan CS
          bila ragu.
        </p>
      ),
    },
    ...(product.installation_guide
      ? [
          {
            value: "cara-pasang",
            label: "Cara pasang",
            content: (
              <div className="leading-7 whitespace-pre-line">{product.installation_guide}</div>
            ),
          },
        ]
      : []),
    {
      value: "ulasan",
      label: `Ulasan${product.review_count ? ` (${product.review_count})` : ""}`,
      content: reviews.length ? (
        <ul className="flex flex-col divide-y divide-border">
          {reviews.map((r) => (
            <li key={r.id} className="flex flex-col gap-1.5 py-4">
              <div className="flex items-center gap-2 text-sm">
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
                <span className="font-medium">{r.reviewer}</span>
                <span className="text-muted-foreground">
                  · {dateFormat.format(new Date(r.createdAt))}
                </span>
              </div>
              {r.comment ? <p>{r.comment}</p> : null}
              {r.reply ? (
                <p className="rounded-md bg-muted px-3 py-2 text-sm">Balasan NZO: {r.reply}</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">
          Belum ada ulasan. Ulasan muncul setelah pembeli menerima pesanan.
        </p>
      ),
    },
  ];

  const inStock = product.variants.length
    ? product.variants.some((v) => v.stock > 0)
    : product.stock > 0;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    description: describe(product),
    url: `${SITE_URL}/products/${product.slug}`,
    ...(product.brand ? { brand: { "@type": "Brand", name: product.brand.name } } : {}),
    offers: {
      "@type": "Offer",
      priceCurrency: "IDR",
      price: product.price,
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${SITE_URL}/products/${product.slug}`,
    },
    ...(product.review_count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.average_rating,
            reviewCount: product.review_count,
          },
        }
      : {}),
  };

  return (
    <div className="nzo-container pt-6 pb-28 sm:pb-16 md:pt-8">
      <script
        type="application/ld+json"
        // JSON dari data produk sendiri; `<` di-escape agar tidak bisa menutup tag script.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Beranda</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {category?.parent ? (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={`/categories/${category.parent.slug}`}>{category.parent.name}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </>
          ) : null}
          {category && category.slug !== "belum-dikategorikan" ? (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={`/categories/${category.slug}`}>{category.name}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </>
          ) : null}
          <BreadcrumbSeparator className="max-sm:hidden" />
          <BreadcrumbItem className="max-sm:hidden">
            <BreadcrumbPage className="line-clamp-1 max-w-80">{product.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <ProductView
        product={{
          id: product.id,
          name: product.name,
          sku: product.sku,
          price: product.price,
          compare_at_price: product.compare_at_price,
          stock: product.stock,
          brand: product.brand,
          average_rating: Number(product.average_rating),
          review_count: product.review_count,
          total_sold: product.total_sold,
        }}
        variants={product.variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          name: v.name,
          price: v.price,
          compare_at_price: v.compare_at_price,
          stock: v.stock,
          image_public_id: v.image_public_id,
        }))}
        images={product.images.map((i) => ({
          id: i.id,
          public_id: i.public_id,
          alt_text: i.alt_text,
          variant_id: i.variant_id,
        }))}
        initialVariantSku={variantSku ?? null}
        fit={fitFor(product, vehicle)}
        hasFitmentData={product.fitments.length > 0}
        garage={{
          makes: vehicles.makes,
          models: vehicles.models,
          active: vehicle
            ? { modelId: vehicle.modelId, year: vehicle.year, label: vehicle.label }
            : null,
        }}
        wishlisted={wishlist.includes(product.id)}
      />

      <section aria-label="Detail produk" className="mt-12 md:mt-16">
        <ProductTabs tabs={tabs} />
      </section>

      {related.length ? (
        <section aria-labelledby="produk-terkait" className="mt-16">
          <h2 id="produk-terkait" className="mb-5 text-xl md:text-2xl">
            Produk terkait
          </h2>
          <ProductGrid
            items={related.slice(0, 8)}
            wishlistIds={new Set(wishlist)}
            priorityCount={0}
          />
        </section>
      ) : null}
    </div>
  );
}
