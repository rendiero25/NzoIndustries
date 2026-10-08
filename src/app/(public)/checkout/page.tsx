import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { CheckoutForm } from "@/components/storefront/checkout-form";
import { getCurrentUser } from "@/lib/auth/guards";
import { getPaymentOptions, getUserAddresses } from "@/server/queries/checkout";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false },
};

/** Checkout wajib login (D-28); keranjang guest digabung saat halaman dimuat. */
export default async function CheckoutPage() {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirectTo=${encodeURIComponent("/checkout")}`);

  const [addresses, payment] = await Promise.all([getUserAddresses(user.id), getPaymentOptions()]);

  return (
    <div className="nzo-container py-8 md:py-12">
      <PageHeader title="Checkout" />
      <CheckoutForm
        userId={user.id}
        initialAddresses={addresses}
        paymentProviders={payment.providers}
        paymentTimeoutMinutes={payment.timeoutMinutes}
      />
    </div>
  );
}
