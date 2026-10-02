import Link from "next/link";

import { SiteLogo } from "@/components/shared/site-logo";

type FooterLink = { label: string; href: string; external?: boolean };

const SHOP: FooterLink[] = [
  { label: "Part motor", href: "/products?category=motor" },
  { label: "Part mobil", href: "/products?category=mobil" },
  { label: "Perawatan & alat", href: "/products?category=non-otomotif" },
  { label: "Semua brand", href: "/brands" },
];

const HELP: FooterLink[] = [
  { label: "Lacak pesanan", href: "/dashboard/orders" },
  { label: "Akun saya", href: "/dashboard" },
  { label: "Tentang NZO", href: "/about" },
];

// TODO [P-08]: halaman legal resmi dari klien.
const POLICY: FooterLink[] = [
  { label: "Kebijakan privasi", href: "/kebijakan-privasi" },
  { label: "Syarat & ketentuan", href: "/syarat-ketentuan" },
  { label: "Pengembalian & garansi", href: "/kebijakan-pengembalian" },
];

function Column({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <h2 className="text-sm font-semibold tracking-normal text-white">{title}</h2>
      <ul className="mt-4 flex flex-col gap-3">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="text-sm text-white/65 transition-colors hover:text-white"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Footer asphalt (design-system.md §5 no. 10). Data toko, metode pembayaran,
 * dan kurir ditampilkan setelah klien mengonfirmasi (P-02, P-11, P-12).
 */
export function StoreFooter() {
  const year = new Date().getFullYear();
  const wa = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "");

  return (
    <footer className="mt-auto bg-asphalt text-white">
      <div className="nzo-container grid gap-12 py-14 md:grid-cols-12 md:py-20">
        <div className="flex flex-col gap-5 md:col-span-5">
          <SiteLogo variant="footer" tone="light" />
          <p className="max-w-sm text-sm leading-6 text-white/65">
            Suku cadang dan aksesoris motor dan mobil. Pilih kendaraanmu, lalu belanja part yang
            memang pas.
          </p>
          {wa ? (
            <a
              href={`https://wa.me/${wa}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 w-fit items-center rounded-md border border-white/25 px-4 text-sm font-semibold transition-colors hover:border-white"
            >
              Tanya CS lewat WhatsApp
            </a>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 md:col-span-7">
          <Column title="Belanja" links={SHOP} />
          <Column title="Bantuan" links={HELP} />
          <Column title="Kebijakan" links={POLICY} />
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="nzo-container flex flex-col gap-2 py-6 text-caption text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} NZO Industries</p>
          {/* TODO [P-11]: alamat toko/gudang dari klien */}
          <p>Alamat toko segera tersedia</p>
        </div>
      </div>
    </footer>
  );
}
