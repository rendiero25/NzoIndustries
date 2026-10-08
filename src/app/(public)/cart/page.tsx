import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { CartView } from "@/components/storefront/cart-view";
import { getCurrentUser } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Keranjang",
  robots: { index: false },
};

export default async function CartPage() {
  const user = await getCurrentUser();

  return (
    <div className="nzo-container py-8 md:py-12">
      <PageHeader title="Keranjang" className="mb-6" />
      <CartView isLoggedIn={!!user} />
    </div>
  );
}
