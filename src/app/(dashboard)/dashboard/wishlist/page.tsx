import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/legacy/server";
import { fetchWishlistForUser, WISHLIST_PER_PAGE } from "@/lib/data/dashboard-user";
import { WishlistTileCard } from "@/components/dashboard/wishlist-tile-card";
import { WishlistPagination } from "@/components/dashboard/wishlist-pagination";

export const metadata: Metadata = {
  title: "Wishlist",
};

export default async function WishlistPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? "1", 10) || 1);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/dashboard/wishlist");

  const { items, total } = await fetchWishlistForUser(user.id, page - 1);

  return (
    <div className="w-full">
      <p className="text-[10px] font-bold text-muted-foreground uppercase">Favorit</p>
      <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">Wishlist</h1>

      {items.length === 0 ? (
        <p className="mt-10 text-sm text-steel-700">
          {total === 0
            ? "Wishlist kosong — jelajahi katalog dan simpan produk favoritmu."
            : "Tidak ada item di halaman ini."}
        </p>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
          {items.map((it) => (
            <li key={it.wishlistId} className="min-w-0">
              <WishlistTileCard item={it} />
            </li>
          ))}
        </ul>
      )}

      {total > WISHLIST_PER_PAGE && (
        <Suspense>
          <WishlistPagination total={total} perPage={WISHLIST_PER_PAGE} currentPage={page} />
        </Suspense>
      )}
    </div>
  );
}
