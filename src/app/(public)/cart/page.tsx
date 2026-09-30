import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { fetchCartCrossSellProducts } from "@/lib/data/product-detail-page";
import { fetchUserCartWithLines } from "@/lib/data/user-cart-lines";
import { CartCheckoutStepper } from "@/components/store/cart-checkout-stepper";
import { CartClientShell } from "@/components/store/cart-client-shell";
import { HomeProductTile } from "@/components/store/home-product-tile";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Keranjang",
  description: "Review barang di keranjang belanja NZO Industries Anda sebelum checkout.",
};

async function CrossSellSection({
  excludedCategoryIds,
  excludedProductIds,
}: {
  excludedCategoryIds: string[];
  excludedProductIds: string[];
}) {
  const crossSell = await fetchCartCrossSellProducts({
    excludedCategoryIds,
    excludedProductIds,
    limit: 5,
  });
  if (!crossSell.length) return null;
  return (
    <section className="mt-16 border-t border-[#e8e4dc] pt-12">
      <h2 className="text-lg font-bold text-[#1d1d1f] sm:text-xl">
        Produk acak dari kategori lainnya
      </h2>
      <p className="mt-1 text-sm text-[#7a7a7a]">
        Kurasi otomatis di luar kategori barang di keranjang Anda.
      </p>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
        {crossSell.map((p) => (
          <div key={p.productId} className="min-w-0 overflow-hidden">
            <HomeProductTile product={p} layout="fluidRow" className="h-full border-0" />
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function CartPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent("/cart")}`);
  }

  const cart = await fetchUserCartWithLines(user.id);
  if (!cart) {
    return (
      <div className="min-h-[50vh] bg-[#f4f1ea] px-4 py-20 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] text-center text-[#1d1d1f] md:pb-20">
        <h1 className="mx-auto mt-12 max-w-lg text-2xl font-bold">Keranjang</h1>
        <p className="mx-auto mt-3 max-w-lg text-[17px] text-[#7a7a7a]">
          Keranjang Anda masih kosong.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block text-[15px] font-semibold text-[#EA5329] hover:underline"
        >
          Lanjut belanja
        </Link>
      </div>
    );
  }

  const lines = cart.lines;
  if (lines.length === 0) {
    return (
      <div className="min-h-[50vh] bg-[#f4f1ea] px-4 py-20 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] text-center text-[#1d1d1f] md:pb-20">
        <h1 className="mx-auto mt-12 max-w-lg text-2xl font-bold">Keranjang</h1>
        <p className="mx-auto mt-3 max-w-lg text-[17px] text-[#7a7a7a]">
          Belum ada barang di keranjang.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block text-[15px] font-semibold text-[#EA5329] hover:underline"
        >
          Lanjut belanja
        </Link>
      </div>
    );
  }

  const excludedCategoryIds = [...new Set(cart.excludedCategoryIds)];
  const excludedProductIds = [...new Set(cart.excludedProductIds)];

  return (
    <div className="bg-gradient-to-b from-[#f4f1ea]/70 to-transparent pt-6 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] text-[#1d1d1f] sm:pt-8 md:pb-20 lg:pb-20">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="py-2 sm:py-3">
          <CartCheckoutStepper current={1} />
        </div>

        <h1 className="sr-only">Keranjang belanja</h1>
        <CartClientShell lines={lines} />

        <Suspense fallback={null}>
          <CrossSellSection
            excludedCategoryIds={excludedCategoryIds}
            excludedProductIds={excludedProductIds}
          />
        </Suspense>
      </div>
    </div>
  );
}
