"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { CreditCard, Heart, Share2, Truck } from "lucide-react";
import { toast } from "sonner";

import {
  addVariantToCart,
  toggleWishlistProduct,
} from "@/app/(public)/products/_actions/product-detail-actions";
import { computeVariantUnitPrice, pickDefaultVariantId } from "@/lib/utils/product-detail-pricing";
import type {
  ProductDetailPublic,
  ProductReviewPublic,
  RatingHistogramRow,
} from "@/lib/types/product-detail";
import { formatDate, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/store/cart-store";
import { StarRatingDisplay } from "@/components/shared/star-rating-display";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { CarouselNavButton } from "@/components/ui/carousel-nav-button";
import { ChoiceChip } from "@/components/ui/choice-chip";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductShareDialog } from "@/components/store/product-share-dialog";
import { ProductShippingDialog } from "@/components/store/product-shipping-dialog";
import { ReviewPhotos } from "@/components/store/review-photos";
import { BITESHIP_COURIER_BRANDS } from "@/lib/biteship/courier-brands";

const DESCRIPTION_PREVIEW_CHARS = 420;

export type ProductDetailClientProps = {
  product: ProductDetailPublic;
  reviews: ProductReviewPublic[];
  histogram: RatingHistogramRow[];
  /** Tidak lagi di-pass dari server — di-fetch client-side via /api/wishlist/check */
  initialInWishlist?: boolean;
  siteBaseUrl: string;
};

function buildProductUrl(siteBaseUrl: string, slug: string): string {
  const base = siteBaseUrl.replace(/\/$/, "");
  if (base.length > 0) return `${base}/products/${encodeURIComponent(slug)}`;
  if (typeof window !== "undefined") return window.location.href;
  return `/products/${slug}`;
}

export function ProductDetailClient({
  product,
  reviews,
  histogram,
  initialInWishlist,
  siteBaseUrl,
}: ProductDetailClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const [cartPending, startCartTransition] = useTransition();
  const [wishlistPending, startWishlistTransition] = useTransition();
  const incrementCart = useCartStore((s) => s.incrementCart);
  const defaultId = useMemo(
    () => pickDefaultVariantId(product.variants, product.basePrice, product.salePrice),
    [product.variants, product.basePrice, product.salePrice],
  );
  const [variantId, setVariantId] = useState<string | null>(defaultId);
  const [qty, setQty] = useState(product.minOrderQty);
  const [imgIndex, setImgIndex] = useState(0);
  // Foto varian tidak masuk galeri/carousel. Saat true, foto utama menampilkan
  // foto varian yang dipilih; begitu pembeli menggeser carousel atau klik
  // thumbnail, tampilan pindah ke galeri foto produk.
  const [showVariantImage, setShowVariantImage] = useState(true);
  const [descExpanded, setDescExpanded] = useState(false);
  const [detailTab, setDetailTab] = useState<"detail" | "extra">("detail");
  const [inWishlist, setInWishlist] = useState(initialInWishlist ?? false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const [shippingDialogOpen, setShippingDialogOpen] = useState(false);
  const thumbContainerRef = useRef<HTMLDivElement>(null);

  // Fetch wishlist state client-side so the product page can be ISR-cached
  useEffect(() => {
    if (!isAuthenticated) return;
    fetch(`/api/wishlist/check?productId=${product.id}`)
      .then((r) => r.json())
      .then(({ inWishlist: w }: { inWishlist: boolean }) => setInWishlist(w))
      .catch(() => {});
  }, [isAuthenticated, product.id]);

  const variant = useMemo(
    () => product.variants.find((v) => v.id === variantId) ?? product.variants[0] ?? null,
    [product.variants, variantId],
  );

  const { listPrice, unitPrice, discountPercent } = useMemo(() => {
    if (!variant) return { listPrice: 0, unitPrice: 0, discountPercent: null as number | null };
    return computeVariantUnitPrice({
      basePrice: product.basePrice,
      salePrice: product.salePrice,
      variantPrice: variant.price,
    });
  }, [variant, product.basePrice, product.salePrice]);

  const maxQty = variant?.stock ?? 0;
  const minQty = product.minOrderQty;

  const clampQty = useCallback(
    (n: number) => {
      if (maxQty <= 0) return minQty;
      return Math.min(maxQty, Math.max(minQty, n));
    },
    [maxQty, minQty],
  );

  useEffect(() => {
    setQty((q) => clampQty(q));
  }, [variant?.id, clampQty]);

  const subtotal = unitPrice * qty;
  const subtotalList = listPrice * qty;

  const images = useMemo(
    () =>
      product.images.length > 0
        ? product.images
        : [{ id: "", url: "", alt: product.name, sortOrder: 0 }],
    [product.images, product.name],
  );
  const safeImgIndex = Math.min(imgIndex, Math.max(0, images.length - 1));

  const variantImageUrl = variant?.imageUrl ?? null;
  // Foto varian diperlakukan sebagai slot virtual di depan galeri: foto utama
  // saja, tidak pernah muncul sebagai thumbnail.
  const activeVariantImage =
    showVariantImage && variantImageUrl
      ? { url: variantImageUrl, alt: variant ? `${product.name} - ${variant.name}` : product.name }
      : null;
  const currentImage = activeVariantImage ?? images[safeImgIndex];
  // Galeri bisa kosong (semua fotonya dipakai varian) — nav dihitung dari galeri
  // asli supaya panah tidak menggeser ke slot placeholder.
  const galleryCount = product.images.length;
  const canGoPrev = activeVariantImage ? false : safeImgIndex > 0 || !!variantImageUrl;
  const canGoNext = activeVariantImage ? galleryCount > 0 : safeImgIndex < galleryCount - 1;
  const showNav = galleryCount > 1 || (!!variantImageUrl && galleryCount > 0);

  const goPrev = () => {
    if (safeImgIndex === 0 && variantImageUrl) {
      setShowVariantImage(true);
      return;
    }
    setImgIndex((i) => Math.max(0, i - 1));
  };

  const goNext = () => {
    if (activeVariantImage) {
      setShowVariantImage(false);
      setImgIndex(0);
      return;
    }
    setImgIndex((i) => Math.min(images.length - 1, i + 1));
  };

  // Scroll active thumbnail into view within the strip — uses container.scrollTo to avoid
  // propagating to the window scroll (scrollIntoView with block:"nearest" can scroll the page
  // on initial mount when the strip is below the fold).
  useEffect(() => {
    const container = thumbContainerRef.current;
    if (!container) return;
    const el = container.children[safeImgIndex] as HTMLElement | undefined;
    if (!el) return;
    const targetLeft = el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2;
    container.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
  }, [safeImgIndex]);

  const variantImage = useMemo(() => {
    if (variantImageUrl) return { url: variantImageUrl, alt: variant?.name ?? product.name };
    const fallback = images[0] ?? null;
    return fallback ? { url: fallback.url, alt: fallback.alt ?? product.name } : null;
  }, [variantImageUrl, variant?.name, images, product.name]);
  const description = product.description?.trim() ?? "";
  const showDescToggle = description.length > DESCRIPTION_PREVIEW_CHARS;
  const descriptionPreview = descExpanded
    ? description
    : description.slice(0, DESCRIPTION_PREVIEW_CHARS);

  const totalReviews = histogram.reduce((s, h) => s + h.count, 0) || product.reviewCount;
  const histMax = Math.max(1, ...histogram.map((h) => h.count));

  const handleAddCart = () => {
    if (!isAuthenticated) {
      router.push(`/login?redirectTo=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!variant || variant.stock < 1) {
      toast.error("Varian tidak tersedia atau stok habis.");
      return;
    }
    const q = clampQty(qty);
    startCartTransition(async () => {
      const res = await addVariantToCart(variant.id, q);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      incrementCart(q);
      toast.success("Ditambahkan ke keranjang.");
      router.refresh();
    });
  };

  const handleBuyNow = () => {
    if (!isAuthenticated) {
      router.push(`/login?redirectTo=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!variant || variant.stock < 1) {
      toast.error("Varian tidak tersedia atau stok habis.");
      return;
    }
    const q = clampQty(qty);
    router.push(`/checkout?buyNow=${variant.id}&qty=${q}`);
  };

  const handleWishlist = () => {
    startWishlistTransition(async () => {
      const res = await toggleWishlistProduct(product.id);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setInWishlist(res.inWishlist);
      toast.success(res.inWishlist ? "Disimpan ke wishlist." : "Dihapus dari wishlist.");
      router.refresh();
    });
  };

  const productUrl = buildProductUrl(siteBaseUrl, product.slug);

  const currentReview = reviews[reviewIndex] ?? null;
  if (product.variants.length === 0) {
    return (
      <div className="bg-white px-4 py-20 text-center text-foreground">
        <p className="text-base text-muted-foreground">Produk ini belum memiliki varian aktif.</p>
        <Link
          href="/"
          className="mt-6 inline-block text-[15px] font-semibold text-foreground hover:underline"
        >
          Kembali ke beranda
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white text-foreground">
      {/* Atas: kiri info + galeri, kanan kartu belanja */}
      <section className="py-8">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-24">
          <div className="flex flex-col justify-between gap-10 lg:flex-row lg:items-start">
            <div className="min-w-0">
              <div className="flex flex-col items-start justify-between gap-8 lg:flex-row">
                {/* Galeri */}
                <div className="mx-auto w-full max-w-[196px] min-w-0 sm:mx-0 sm:max-w-[266px] md:max-w-[308px] lg:flex lg:max-w-[336px] lg:flex-col">
                  <div className="group/mainimg relative aspect-square w-full overflow-hidden">
                    {currentImage.url ? (
                      <Image
                        key={currentImage.url}
                        src={currentImage.url}
                        alt={currentImage.alt ?? product.name}
                        fill
                        className="object-contain"
                        sizes="(max-width: 640px) 280px, (max-width: 768px) 380px, (max-width: 1024px) 440px, 480px"
                        priority
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        Tanpa gambar
                      </div>
                    )}
                    {showNav ? (
                      <>
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center p-2 opacity-0 transition-opacity duration-200 group-hover/mainimg:opacity-100 focus-within:opacity-100">
                          <CarouselNavButton
                            direction="prev"
                            surface="on-photo"
                            disabled={!canGoPrev}
                            onClick={goPrev}
                            className="pointer-events-auto scale-90"
                          />
                        </div>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center p-2 opacity-0 transition-opacity duration-200 group-hover/mainimg:opacity-100 focus-within:opacity-100">
                          <CarouselNavButton
                            direction="next"
                            surface="on-photo"
                            disabled={!canGoNext}
                            onClick={goNext}
                            className="pointer-events-auto scale-90"
                          />
                        </div>
                      </>
                    ) : null}
                  </div>
                  {images.length > 1 ? (
                    <div className="mt-3">
                      <div
                        ref={thumbContainerRef}
                        className="scrollbar-none relative flex gap-2 overflow-x-auto"
                      >
                        {images.map((im, i) => {
                          const isActive = !activeVariantImage && i === safeImgIndex;
                          return (
                            <Button
                              key={`${im.url}-${i}`}
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => {
                                setShowVariantImage(false);
                                setImgIndex(i);
                              }}
                              className={cn(
                                "relative h-16 w-16 shrink-0 overflow-hidden rounded-none border-2 bg-transparent p-0",
                                isActive ? "border-foreground" : "border-transparent",
                              )}
                              aria-label={`Gambar ${i + 1}`}
                              aria-current={isActive ? "true" : undefined}
                            >
                              {im.url ? (
                                <Image
                                  src={im.url}
                                  alt=""
                                  fill
                                  className="object-contain p-1"
                                  sizes="64px"
                                />
                              ) : null}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Judul, kategori, varian, rating, harga */}
                <div className="min-w-0 space-y-3">
                  <h1 className="text-lg leading-snug font-semibold">
                    {product.name}
                    {variant ? ` - ${variant.name}` : ""}
                  </h1>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold text-foreground">
                    <div className="flex items-center gap-1.5">
                      <Truck className="h-4 w-4 shrink-0" aria-hidden />
                      Bebas Ongkir
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="h-4 w-4 shrink-0" aria-hidden />
                      Cicilan 0%
                    </div>
                  </div>

                  {product.category ? (
                    <p className="text-sm text-foreground">{product.category.name}</p>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    {product.reviewCount > 0 ? (
                      <>
                        <span className="inline-flex items-center gap-1">
                          <svg
                            className="h-3.5 w-3.5 shrink-0 text-rating"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            aria-hidden
                          >
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                          <span className="font-medium text-foreground">
                            {product.averageRating.toFixed(1)}
                          </span>
                        </span>
                        <span className="text-steel-200">·</span>
                        <span>({product.reviewCount} rating)</span>
                        <span className="text-steel-200">·</span>
                      </>
                    ) : null}
                    <span className="text-foreground">{product.totalSold} terjual</span>
                  </div>

                  <div className="space-y-2 py-2">
                    <p className="text-4xl font-bold">{formatRupiah(unitPrice)}</p>
                    {discountPercent != null && discountPercent > 0 ? (
                      <div className="flex flex-wrap items-center gap-2 text-base">
                        <span className="text-muted-foreground line-through">
                          {formatRupiah(listPrice)}
                        </span>
                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-foreground">
                          {discountPercent}% off
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div className="border-t border-border pt-5 pb-2 sm:max-w-sm">
                    <p className="text-sm font-bold text-foreground">Detail Produk</p>
                    <p className="mt-2 line-clamp-3 text-sm text-foreground">
                      {description || "Belum ada deskripsi untuk produk ini."}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setDetailTab("detail");
                        document
                          .getElementById("detail-produk-tabs")
                          ?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="mt-2 text-xs font-semibold text-foreground"
                    >
                      Lihat Selengkapnya
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 border-t border-border pt-2 text-sm sm:max-w-sm">
                    <div>
                      <p className="text-muted-foreground">Kondisi</p>
                      <p className="font-medium">
                        {product.condition === "second" ? "Second" : "Baru"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Min. Pembelian</p>
                      <p className="font-medium">{product.minOrderQty} pcs</p>
                    </div>
                    {product.brand ? (
                      <div>
                        <p className="text-muted-foreground">Merek</p>
                        <p className="font-medium">{product.brand.name}</p>
                      </div>
                    ) : null}
                    {variant ? (
                      <div>
                        <p className="text-muted-foreground">Berat Satuan</p>
                        <p className="font-medium">{variant.weight} gram</p>
                      </div>
                    ) : null}
                  </div>

                  <div className="border-t border-border pt-5 sm:max-w-sm">
                    <button
                      type="button"
                      onClick={() => setShippingDialogOpen(true)}
                      className="flex w-full items-center justify-between gap-3 text-left"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground">Pilihan Pengiriman</p>
                        <div className="mt-2 flex items-center gap-2.5">
                          {BITESHIP_COURIER_BRANDS.filter((b) => b.logo && !b.onDemand)
                            .slice(0, 6)
                            .map((b) => (
                              <img
                                key={b.code}
                                src={b.logo}
                                alt={b.name}
                                className="h-5 w-auto max-w-[44px] shrink-0 object-contain"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = "none";
                                }}
                              />
                            ))}
                        </div>
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-foreground">
                        Lihat Selengkapnya
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Kartu belanja */}
            <aside className="w-full shrink-0 lg:max-w-[21rem] lg:min-w-[19rem] xl:max-w-[22rem] xl:min-w-[20rem]">
              <div className="rounded-[18px] border border-muted bg-muted p-5 pb-4 shadow-[0_1px_0_rgba(0,0,0,0.04)] md:p-6 md:pb-5 lg:p-6 lg:pb-5">
                {product.variants.length > 1 ? (
                  <div className="pb-3">
                    <p className="mb-2 text-xs font-semibold text-foreground">Pilih Varian</p>
                    <div className="flex flex-wrap gap-2">
                      {product.variants.map((v) => (
                        <ChoiceChip
                          key={v.id}
                          selected={v.id === variant?.id}
                          disabled={v.stock < 1}
                          onClick={() => {
                            setVariantId(v.id);
                            setQty((q) => clampQty(q));
                            if (v.imageUrl) setShowVariantImage(true);
                          }}
                        >
                          {v.name}
                        </ChoiceChip>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div
                  className={cn(
                    "flex items-center gap-3 border-b border-border pb-5",
                    product.variants.length > 1 && "pt-3",
                  )}
                >
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                    {variantImage?.url ? (
                      <Image
                        src={variantImage.url}
                        alt={variantImage.alt ?? product.name}
                        fill
                        className="object-contain p-1"
                        sizes="56px"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{product.name}</p>
                    {variant ? (
                      <p className="text-xs text-muted-foreground">{variant.name}</p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                  <QuantityStepper
                    value={qty}
                    min={minQty}
                    max={maxQty}
                    disabled={cartPending || wishlistPending}
                    size="compact"
                    className="py-0"
                    onDecrease={() => setQty((q) => clampQty(q - 1))}
                    onIncrease={() => setQty((q) => clampQty(q + 1))}
                  />
                  <p className="max-w-[14rem] text-right text-xs leading-snug text-foreground">
                    {maxQty < 1
                      ? "Stok habis untuk varian ini."
                      : maxQty <= 20
                        ? `Hanya ${maxQty} item yang tersisa`
                        : `Stok: ${maxQty} tersedia`}
                  </p>
                </div>

                <div className="mt-5 space-y-2 border-t border-border pt-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm text-muted-foreground">Subtotal</p>
                    <span className="text-xl font-bold text-foreground">
                      {formatRupiah(subtotal)}
                    </span>
                  </div>
                  {discountPercent != null && discountPercent > 0 ? (
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-muted-foreground line-through">
                        {formatRupiah(subtotalList)}
                      </span>
                      <span className="rounded-full bg-primary/12 px-2 py-0.5 text-xs font-bold text-foreground">
                        Hemat {discountPercent}%
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 flex flex-col gap-3">
                  <Button
                    type="button"
                    variant="primary"
                    disabled={!variant || variant.stock < 1 || cartPending}
                    onClick={handleBuyNow}
                    className="w-full"
                  >
                    Beli sekarang
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!variant || variant.stock < 1 || cartPending}
                    loading={cartPending}
                    onClick={handleAddCart}
                    className="w-full"
                  >
                    + Keranjang
                  </Button>
                </div>

                <div className="mt-2 flex justify-center text-xs font-medium">
                  <Button
                    type="button"
                    variant="link"
                    size="xs"
                    onClick={handleWishlist}
                    loading={wishlistPending}
                    className={cn("gap-1 px-0 whitespace-nowrap", inWishlist && "text-brand")}
                  >
                    <Heart
                      className={cn("h-3.5 w-3.5", inWishlist && "fill-current")}
                      aria-hidden
                    />
                    Wishlist
                  </Button>
                  <span className="text-steel-200" aria-hidden>
                    |
                  </span>
                  <Button
                    type="button"
                    variant="link"
                    size="xs"
                    onClick={() => setShareOpen(true)}
                    className="gap-1 px-0 whitespace-nowrap text-foreground"
                  >
                    <Share2 className="h-3.5 w-3.5" aria-hidden />
                    Share
                  </Button>
                  <ProductShareDialog
                    open={shareOpen}
                    onOpenChange={setShareOpen}
                    productName={product.name}
                    productUrl={productUrl}
                  />
                </div>
              </div>
            </aside>

            {variant ? (
              <ProductShippingDialog
                open={shippingDialogOpen}
                onOpenChange={setShippingDialogOpen}
                isAuthenticated={isAuthenticated}
                loginHref={`/login?redirectTo=${encodeURIComponent(pathname)}`}
                variantId={variant.id}
                qty={qty}
              />
            ) : null}
          </div>
        </div>
      </section>

      {/* Bawah: deskripsi | rating & ulasan */}
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-24">
          <div className="grid gap-12 md:grid-cols-2 md:gap-10 lg:gap-16">
            <div id="detail-produk-tabs" className="scroll-mt-20">
              <Tabs
                value={detailTab}
                onValueChange={(v) => setDetailTab(v as "detail" | "extra")}
                className="gap-6"
              >
                <TabsList
                  variant="line"
                  className="h-auto w-full justify-start gap-8 rounded-none bg-transparent p-0"
                >
                  <TabsTrigger
                    value="detail"
                    className="rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 pb-3 text-base font-semibold text-muted-foreground shadow-none data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground"
                  >
                    Detail
                  </TabsTrigger>
                  <TabsTrigger
                    value="extra"
                    className="rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 pb-3 text-base font-semibold text-muted-foreground shadow-none data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground"
                  >
                    Informasi lainnya
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="detail" className="mt-0">
                  <div className="space-y-4">
                    {description ? (
                      <>
                        <div className="text-base leading-[1.47] whitespace-pre-wrap text-foreground">
                          {descriptionPreview}
                          {!descExpanded && showDescToggle ? "…" : null}
                        </div>
                        {showDescToggle ? (
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            onClick={() => setDescExpanded((e) => !e)}
                            className="h-auto p-0 text-[15px] font-semibold"
                          >
                            {descExpanded ? "Tampilkan lebih sedikit" : "Lihat lebih lanjut"}
                          </Button>
                        ) : null}
                      </>
                    ) : (
                      <p className="text-base text-muted-foreground">
                        Belum ada deskripsi untuk produk ini.
                      </p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="extra" className="mt-0">
                  <div className="space-y-6 text-base leading-relaxed">
                    {product.tags.length > 0 ? (
                      <div>
                        <p className="mb-2 font-semibold">Tag</p>
                        <ul className="list-inside list-disc text-foreground">
                          {product.tags.map((t) => (
                            <li key={t}>{t}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <div>
                      <p className="mb-2 font-semibold">Varian & SKU</p>
                      <ul className="space-y-1 text-muted-foreground">
                        {product.variants.map((v) => (
                          <li key={v.id}>
                            <span className="text-foreground">{v.name}</span> — {v.sku}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div>
              <h2 className="text-xl font-semibold">Rating &amp; Ulasan</h2>
              <div className="mt-6 flex flex-col gap-8 sm:flex-row sm:items-start">
                <div className="shrink-0 text-center sm:text-left">
                  <p className="text-4xl leading-none font-bold">
                    {product.averageRating.toFixed(1)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">/5</p>
                  <p className="mt-2 text-sm text-muted-foreground">({totalReviews} rating)</p>
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  {histogram.map((h) => (
                    <div key={h.stars} className="flex items-center gap-3">
                      <span className="w-3 text-xs text-muted-foreground">{h.stars}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-steel-200">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${(h.count / histMax) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-xs text-muted-foreground">
                        {h.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {reviews.length > 0 && currentReview ? (
                <div className="mt-8 rounded-[18px] border border-muted bg-muted p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{currentReview.authorName}</p>
                      <StarRatingDisplay rating={currentReview.rating} size="md" className="mt-1" />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(currentReview.createdAt)}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <CarouselNavButton
                        direction="prev"
                        surface="surface"
                        className="border border-border bg-white"
                        aria-label="Ulasan sebelumnya"
                        onClick={() =>
                          setReviewIndex((i) => (i - 1 + reviews.length) % reviews.length)
                        }
                      />
                      <CarouselNavButton
                        direction="next"
                        surface="surface"
                        className="border border-border bg-white"
                        aria-label="Ulasan berikutnya"
                        onClick={() => setReviewIndex((i) => (i + 1) % reviews.length)}
                      />
                    </div>
                  </div>
                  {currentReview.comment ? (
                    <p className="mt-4 text-[15px] leading-relaxed text-foreground">
                      {currentReview.comment}
                    </p>
                  ) : (
                    <p className="mt-4 text-sm text-muted-foreground italic">
                      Tanpa komentar teks.
                    </p>
                  )}
                  <ReviewPhotos
                    key={currentReview.id}
                    images={currentReview.images}
                    authorName={currentReview.authorName}
                  />
                </div>
              ) : (
                <p className="mt-8 text-sm text-muted-foreground">
                  Belum ada ulasan yang dipublikasikan.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
