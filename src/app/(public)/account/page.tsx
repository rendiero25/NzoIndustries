import { Bell, Car, CreditCard, PackageCheck, Truck, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { OrderCard } from "@/components/account/order-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { getAccountSummary } from "@/server/queries/account";

export const metadata = { title: "Ringkasan akun" };

function Stat({
  href,
  icon: Icon,
  label,
  value,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-2 rounded-xl border border-border p-4 transition-colors hover:border-steel-500"
    >
      <Icon className="size-5 text-steel-700" strokeWidth={1.75} aria-hidden />
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </Link>
  );
}

export default async function AccountHomePage() {
  const s = await getAccountSummary();
  const name = s.profile.fullName?.split(" ")[0] ?? "kamu";

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`Halo, ${name}`}
        description="Pantau pesanan, kendaraan, dan akunmu di sini."
        className="pb-0"
      />

      <section aria-label="Status pesanan" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          href="/account/orders?tab=unpaid"
          icon={CreditCard}
          label="Belum bayar"
          value={s.counts.unpaid}
        />
        <Stat
          href="/account/orders?tab=processing"
          icon={PackageCheck}
          label="Diproses"
          value={s.counts.processing}
        />
        <Stat
          href="/account/orders?tab=shipped"
          icon={Truck}
          label="Dikirim"
          value={s.counts.shipped}
        />
        <Stat
          href="/account/orders?tab=completed"
          icon={PackageCheck}
          label="Selesai"
          value={s.counts.completed}
        />
      </section>

      <section aria-labelledby="recent-orders" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 id="recent-orders" className="text-base">
            Pesanan terbaru
          </h2>
          {s.recent.length > 0 ? (
            <Button asChild variant="link" size="sm">
              <Link href="/account/orders">Lihat semua</Link>
            </Button>
          ) : null}
        </div>
        {s.recent.length === 0 ? (
          <EmptyState
            title="Belum ada pesanan"
            description="Pesanan yang kamu buat akan muncul di sini."
            action={{ label: "Mulai belanja", href: "/products" }}
            className="rounded-xl border border-dashed border-border py-10"
          />
        ) : (
          <div className="flex flex-col gap-3">
            {s.recent.map((o) => (
              <OrderCard key={o.orderNumber} order={o} />
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <Link
          href="/account/garage"
          className="flex items-center gap-3 rounded-xl border border-border p-4 transition-colors hover:border-steel-500"
        >
          <Car className="size-5 text-steel-700" strokeWidth={1.75} aria-hidden />
          <span className="flex flex-col text-sm">
            <span className="text-muted-foreground">Kendaraan aktif</span>
            <span className="font-semibold">{s.vehicle?.label ?? "Belum dipilih"}</span>
          </span>
        </Link>
        <Link
          href="/account/notifications"
          className="flex items-center gap-3 rounded-xl border border-border p-4 transition-colors hover:border-steel-500"
        >
          <Bell className="size-5 text-steel-700" strokeWidth={1.75} aria-hidden />
          <span className="flex flex-col text-sm">
            <span className="text-muted-foreground">Notifikasi</span>
            <span className="font-semibold">
              {s.unreadNotifications > 0
                ? `${s.unreadNotifications} belum dibaca`
                : "Semua sudah dibaca"}
            </span>
          </span>
        </Link>
      </section>
    </div>
  );
}
