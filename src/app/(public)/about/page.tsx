import { BadgeCheck, ShieldCheck, Truck, Wrench } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { StaticPage } from "@/components/storefront/static-page";
import { Button } from "@/components/ui/button";
import { getStoreStats } from "@/server/queries/reference";

export const metadata: Metadata = {
  title: "Tentang NZO Industries",
  description:
    "NZO Industries menjual sparepart dan aksesoris motor & mobil, dengan cek kecocokan kendaraan sebelum membeli.",
  alternates: { canonical: "/about" },
};

const num = new Intl.NumberFormat("id-ID");

const VALUES = [
  {
    icon: ShieldCheck,
    title: "Kecocokan dulu",
    text: "Pilih kendaraanmu sekali, lalu kami tandai part yang cocok. Tidak perlu menebak-nebak kode part.",
  },
  {
    icon: BadgeCheck,
    title: "Original",
    text: "Genuine parts pabrikan dan aftermarket dari brand yang jelas asal-usulnya.",
  },
  {
    icon: Wrench,
    title: "Untuk pemilik & bengkel",
    text: "Katalog disusun per kategori dan per kendaraan, cocok untuk perawatan harian maupun stok bengkel.",
  },
  {
    icon: Truck,
    title: "Kirim ke seluruh Indonesia",
    text: "Pesanan dikemas rapi dan dikirim lewat kurir pilihanmu.",
  },
];

export default async function AboutPage() {
  const stats = await getStoreStats().catch(() => null);
  return (
    <StaticPage
      title="Tentang NZO Industries"
      lead="Toko sparepart dan aksesoris motor & mobil yang dimulai dari satu pertanyaan sederhana pembeli: part ini pas tidak untuk kendaraan saya?"
    >
      {stats ? (
        <p className="mb-10 text-steel-700">
          Saat ini ada {num.format(stats.products)} part dari {num.format(stats.brands)} brand untuk{" "}
          {num.format(stats.vehicleModels)} model kendaraan di katalog kami.
        </p>
      ) : null}
      <ul className="grid gap-6 sm:grid-cols-2">
        {VALUES.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex flex-col gap-2 rounded-xl border border-border p-5">
            <Icon className="size-6" strokeWidth={1.75} aria-hidden />
            <h2 className="text-lg">{title}</h2>
            <p className="text-steel-700">{text}</p>
          </li>
        ))}
      </ul>
      <div className="mt-10 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/products">Lihat katalog</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/contact">Hubungi kami</Link>
        </Button>
      </div>
    </StaticPage>
  );
}
