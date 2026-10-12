import type { Metadata } from "next";

import { AccountNav } from "@/components/account/account-nav";
import { countUnreadNotifications, requireAccountUser } from "@/server/queries/account";

export const metadata: Metadata = {
  title: { template: "%s | Akun NZO", default: "Akun saya" },
  robots: { index: false },
};

/** Dashboard user (Fase 7). Guard di sini + di setiap query (bukan hanya proxy). */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAccountUser();
  const unread = await countUnreadNotifications(user.id);

  return (
    <div className="nzo-container py-6 md:py-10">
      <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-10">
        <aside className="lg:sticky lg:top-36 lg:self-start">
          <AccountNav unread={unread} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
