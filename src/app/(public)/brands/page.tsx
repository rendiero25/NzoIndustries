import type { Metadata } from "next";
import Link from "next/link";

import { getBrands } from "@/server/queries/reference";

export const metadata: Metadata = {
  title: "Brand",
  description:
    "Belanja sparepart motor dan mobil berdasarkan brand: genuine parts dan aftermarket pilihan.",
  alternates: { canonical: "/brands" },
};

const num = new Intl.NumberFormat("id-ID");

/** Daftar brand A–Z dengan jumlah produk (logo brand menyusul dari klien). */
export default async function BrandsPage() {
  const brands = await getBrands();
  const groups = new Map<string, typeof brands>();
  for (const b of brands) {
    const letter = /^[a-z]/i.test(b.name) ? b.name[0]!.toUpperCase() : "#";
    groups.set(letter, [...(groups.get(letter) ?? []), b]);
  }
  const letters = [...groups.keys()].sort((a, b) =>
    a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b),
  );

  return (
    <div className="nzo-container py-8 md:py-12">
      <header className="mb-8 flex flex-col gap-2">
        <h1 className="text-[1.75rem] leading-9 md:text-[2.25rem] md:leading-[2.75rem]">Brand</h1>
        <p className="text-muted-foreground">
          {num.format(brands.length)} brand, dari genuine parts pabrikan sampai aftermarket.
        </p>
      </header>

      <nav aria-label="Lompat ke huruf" className="mb-8 flex flex-wrap gap-1">
        {letters.map((l) => (
          <a
            key={l}
            href={`#huruf-${l}`}
            className="inline-flex size-9 items-center justify-center rounded-md border border-border text-sm hover:border-foreground"
          >
            {l}
          </a>
        ))}
      </nav>

      <div className="flex flex-col gap-10">
        {letters.map((l) => (
          <section key={l} id={`huruf-${l}`} aria-labelledby={`h-${l}`} className="scroll-mt-32">
            <h2 id={`h-${l}`} className="mb-3 text-xl">
              {l}
            </h2>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {groups.get(l)!.map((b) => (
                <li key={b.slug}>
                  <Link
                    href={`/brands/${b.slug}`}
                    className="flex h-full items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 transition-colors hover:border-foreground"
                  >
                    <span className="font-medium">{b.name}</span>
                    <span className="text-caption text-muted-foreground tabular-nums">
                      {num.format(b.productCount)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
