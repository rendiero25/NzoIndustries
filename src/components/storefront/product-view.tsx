"use client";

import { BadgeCheck, Maximize2, ShieldCheck, Star, Truck } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import { FitmentBadge } from "@/components/catalog/fitment-badge";
import { Price } from "@/components/catalog/price";
import { ProductImage } from "@/components/catalog/product-image";
import { ShieldMark } from "@/components/catalog/shield-mark";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { effectivePrice, formatIDR } from "@/lib/money";
import { cn } from "@/lib/utils";

import { WishlistButton } from "./card-actions";
import { useAddToCart } from "./use-add-to-cart";
import {
  VehicleSelector,
  type SelectorActive,
  type SelectorMake,
  type SelectorModel,
} from "./vehicle-selector";

export type ViewVariant = {
  id: string;
  sku: string;
  name: string;
  price: number | null;
  compare_at_price: number | null;
  stock: number;
  image_public_id: string | null;
};

export type ViewImage = {
  id: string;
  public_id: string;
  alt_text: string | null;
  variant_id: string | null;
};

export type FitResult = { level: "verified" | "mentioned" | "none"; vehicleLabel: string } | null;

type Props = {
  product: {
    id: string;
    name: string;
    sku: string;
    price: number;
    compare_at_price: number | null;
    stock: number;
    brand: { name: string; slug: string } | null;
    average_rating: number;
    review_count: number;
    total_sold: number;
  };
  variants: ViewVariant[];
  images: ViewImage[];
  initialVariantSku: string | null;
  fit: FitResult;
  hasFitmentData: boolean;
  garage: { makes: SelectorMake[]; models: SelectorModel[]; active: SelectorActive };
  wishlisted: boolean;
};

const soldFormat = new Intl.NumberFormat("id-ID", { notation: "compact" });

/**
 * Bagian atas PDP (design-system §5): galeri, info, varian (ToggleGroup,
 * harga crossfade, ?v= di URL), cek kecocokan, qty + beli, trust strip,
 * sticky buy bar mobile.
 */
export function ProductView({
  product,
  variants,
  images,
  initialVariantSku,
  fit,
  hasFitmentData,
  garage,
  wishlisted,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [variantId, setVariantId] = useState<string | null>(
    variants.find((v) => v.sku.toLowerCase() === initialVariantSku?.toLowerCase())?.id ??
      variants.find((v) => v.stock > 0)?.id ??
      variants[0]?.id ??
      null,
  );
  const variant = variants.find((v) => v.id === variantId) ?? null;
  const { price, compareAt } = effectivePrice(product, variant);
  const stock = variant ? variant.stock : product.stock;
  const soldOut = stock <= 0;
  const [qty, setQty] = useState(1);
  const { add, pending } = useAddToCart();
  const mainImageRef = useRef<HTMLDivElement>(null);

  const gallery = useMemo(() => {
    const list = images.map((i) => ({
      publicId: i.public_id,
      alt: i.alt_text ?? product.name,
      variantId: i.variant_id,
    }));
    if (variant?.image_public_id && !list.some((i) => i.publicId === variant.image_public_id)) {
      list.unshift({
        publicId: variant.image_public_id,
        alt: `${product.name} ${variant.name}`,
        variantId: variant.id,
      });
    }
    return list;
  }, [images, variant, product.name]);
  const variantImageIndex = variant
    ? gallery.findIndex((g) => g.variantId === variant.id || g.publicId === variant.image_public_id)
    : -1;
  const [pickedIndex, setPickedIndex] = useState(0);
  const activeIndex = variantImageIndex >= 0 && pickedIndex === 0 ? variantImageIndex : pickedIndex;
  const [zoom, setZoom] = useState(false);
  const current = gallery[activeIndex] ?? gallery[0];

  function selectVariant(id: string) {
    const v = variants.find((x) => x.id === id);
    if (!v) return;
    setVariantId(id);
    setPickedIndex(0);
    setQty(1);
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("v", v.sku);
    // Tanpa round-trip server: Next menyinkronkan history.replaceState dengan router.
    window.history.replaceState(null, "", `${pathname}?${sp.toString()}`);
  }

  function addToCart(buyNow = false) {
    add(
      { productId: product.id, variantId: variant?.id ?? null, quantity: qty },
      { imageEl: mainImageRef.current, onAdded: buyNow ? () => router.push("/cart") : undefined },
    );
  }

  const buyDisabled = soldOut || (variants.length > 0 && !variant);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-12">
      {/* Galeri */}
      <div className="flex flex-col gap-3 lg:sticky lg:top-36 lg:self-start">
        <div
          ref={mainImageRef}
          className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-steel-50"
        >
          <ProductImage
            publicId={current?.publicId}
            alt={current?.alt ?? product.name}
            sizes="(min-width: 1024px) 50vw, 100vw"
            priority
          />
          {current ? (
            <Button
              type="button"
              variant="icon-chip"
              size="icon-sm"
              className="absolute right-3 bottom-3"
              aria-label="Perbesar foto"
              onClick={() => setZoom(true)}
            >
              <Maximize2 strokeWidth={1.75} />
            </Button>
          ) : null}
        </div>
        {gallery.length > 1 ? (
          <ul className="scrollbar-none flex gap-2 overflow-x-auto" aria-label="Foto produk">
            {gallery.map((g, i) => (
              <li key={`${g.publicId}-${i}`} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setPickedIndex(i)}
                  aria-label={`Foto ${i + 1}`}
                  aria-current={i === activeIndex}
                  className={cn(
                    "relative block size-16 overflow-hidden rounded-md border bg-steel-50 md:size-20",
                    i === activeIndex ? "border-foreground" : "border-border",
                  )}
                >
                  <ProductImage publicId={g.publicId} alt="" sizes="80px" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <Dialog open={zoom} onOpenChange={setZoom}>
          <DialogContent className="max-w-[min(96vw,56rem)] p-2">
            <DialogTitle className="sr-only">{product.name}</DialogTitle>
            <div className="relative aspect-square">
              <ProductImage
                publicId={current?.publicId}
                alt={current?.alt ?? product.name}
                sizes="90vw"
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info & pembelian */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          {product.brand ? (
            <Link
              href={`/brands/${product.brand.slug}`}
              className="text-sm font-medium text-steel-700 hover:text-foreground"
            >
              {product.brand.name}
            </Link>
          ) : null}
          <h1 className="text-2xl leading-8 md:text-[1.75rem] md:leading-9">{product.name}</h1>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {product.review_count > 0 ? (
              <span className="flex items-center gap-1">
                <Star className="size-4 fill-rating text-rating" aria-hidden />
                <span className="font-medium text-foreground tabular-nums">
                  {product.average_rating.toFixed(1)}
                </span>
                <span>({product.review_count} ulasan)</span>
              </span>
            ) : null}
            {product.total_sold > 0 ? (
              <span>{soldFormat.format(product.total_sold)} terjual</span>
            ) : null}
            <span>
              SKU <span className="font-mono text-foreground">{variant?.sku ?? product.sku}</span>
            </span>
          </p>
        </div>

        <div key={`${price}-${compareAt}`} className="motion-safe:animate-tick">
          <Price price={price} compareAt={compareAt} showSaving size="pdp" />
        </div>

        {variants.length ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">
              Varian: <span className="font-normal">{variant?.name ?? "Pilih varian"}</span>
            </p>
            <ToggleGroup
              type="single"
              value={variantId ?? ""}
              onValueChange={(v) => v && selectVariant(v)}
              variant="outline"
              className="flex flex-wrap justify-start gap-2"
              aria-label="Pilih varian"
            >
              {variants.map((v) => (
                <ToggleGroupItem
                  key={v.id}
                  value={v.id}
                  className={cn(
                    "h-auto min-h-10 rounded-md! border px-3 py-2 data-[state=on]:border-foreground data-[state=on]:bg-foreground data-[state=on]:text-background",
                    v.stock <= 0 && "text-muted-foreground line-through decoration-1",
                  )}
                  aria-label={`${v.name}${v.stock <= 0 ? " (stok habis)" : ""}`}
                >
                  {v.name}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        ) : null}

        {/* Cek kecocokan (D-27) */}
        <section
          aria-labelledby="cek-kecocokan"
          className="flex flex-col gap-3 rounded-xl border border-border p-4"
        >
          <h2 id="cek-kecocokan" className="flex items-center gap-2 text-base">
            <ShieldMark className="size-4" />
            Cek kecocokan
          </h2>
          {fit ? (
            fit.level === "verified" ? (
              <FitmentBadge vehicle={fit.vehicleLabel} size="lg" className="self-start" />
            ) : fit.level === "mentioned" ? (
              <p className="text-sm">
                <span className="font-semibold">Disebut untuk {fit.vehicleLabel}</span> di deskripsi
                produk. Kecocokan belum diverifikasi tim kami; tanyakan CS bila ragu.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {hasFitmentData
                  ? `Tidak tercatat cocok untuk ${fit.vehicleLabel}. Lihat daftar kendaraan di tab Kecocokan.`
                  : `Belum ada data kecocokan untuk ${fit.vehicleLabel}.`}
              </p>
            )
          ) : (
            <p className="text-sm text-muted-foreground">
              Pilih kendaraanmu untuk mengecek apakah part ini pas.
            </p>
          )}
          <VehicleSelector makes={garage.makes} models={garage.models} active={garage.active} />
        </section>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <QuantityStepper
              value={qty}
              max={Math.max(1, Math.min(stock, 999))}
              onDecrease={() => setQty((q) => Math.max(1, q - 1))}
              onIncrease={() => setQty((q) => Math.min(stock, q + 1))}
              disabled={buyDisabled}
            />
            <span
              className={cn(
                "text-sm",
                soldOut ? "font-semibold text-danger" : "text-muted-foreground",
              )}
            >
              {soldOut ? "Stok habis" : stock <= 5 ? `Sisa ${stock}` : `Stok ${stock}`}
            </span>
          </div>
          <div className="hidden gap-2 sm:flex">
            <Button
              type="button"
              size="lg"
              className="flex-1"
              disabled={buyDisabled}
              loading={pending}
              onClick={() => addToCart(false)}
            >
              {soldOut ? "Stok habis" : "Tambah ke keranjang"}
            </Button>
            <Button
              type="button"
              size="lg"
              variant="secondary"
              className="flex-1"
              disabled={buyDisabled || pending}
              onClick={() => addToCart(true)}
            >
              Beli sekarang
            </Button>
            <WishlistButton
              productId={product.id}
              initialSaved={wishlisted}
              withLabel
              className="h-12"
            />
          </div>
        </div>

        <ul className="grid gap-3 border-t border-border pt-5 text-sm sm:grid-cols-3">
          <li className="flex items-center gap-2">
            <BadgeCheck className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
            Produk original
          </li>
          <li className="flex items-center gap-2">
            <ShieldCheck className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
            Garansi sesuai ketentuan
          </li>
          <li className="flex items-center gap-2">
            <Truck className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
            Kirim ke seluruh Indonesia
          </li>
        </ul>
      </div>

      {/* Sticky buy bar mobile (§5) */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-lg leading-6 font-bold tabular-nums">{formatIDR(price)}</p>
            {variant ? (
              <p className="truncate text-caption text-muted-foreground">{variant.name}</p>
            ) : null}
          </div>
          <WishlistButton productId={product.id} initialSaved={wishlisted} />
          <Button
            type="button"
            disabled={buyDisabled}
            loading={pending}
            onClick={() => addToCart(false)}
          >
            {soldOut ? "Stok habis" : "Tambah"}
          </Button>
        </div>
      </div>
    </div>
  );
}
