import type { Metadata } from "next";
import Link from "next/link";

import { StaticPage } from "@/components/storefront/static-page";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Cara belanja",
  description:
    "Langkah belanja sparepart di NZO Industries: pilih kendaraan, cek kecocokan, checkout, dan lacak pesanan.",
  alternates: { canonical: "/how-to-buy" },
};

const STEPS = [
  {
    title: "Pilih kendaraanmu",
    text: "Buka Garasi di header atau beranda, pilih jenis, merek, model, dan tahun kendaraan.",
  },
  {
    title: "Cari part",
    text: "Telusuri kategori atau ketik nama/kode part. Nyalakan filter kendaraan untuk melihat part untuk kendaraanmu saja.",
  },
  {
    title: "Cek kecocokan",
    text: "Di halaman produk, lihat bagian Cek kecocokan dan tab Kecocokan kendaraan. Perisai “Cocok” berarti sudah diverifikasi tim kami.",
  },
  {
    title: "Masukkan ke keranjang",
    text: "Pilih varian dan jumlah, lalu tambahkan ke keranjang. Ongkir dihitung saat checkout.",
  },
  {
    title: "Checkout & bayar",
    text: "Isi alamat, pilih kurir dan metode pembayaran, lalu bayar sebelum batas waktu.",
  },
  {
    title: "Lacak pesanan",
    text: "Status pesanan dan nomor resi bisa dilihat di akunmu sampai paket diterima.",
  },
];

export default function HowToBuyPage() {
  return (
    <StaticPage
      title="Cara belanja"
      lead="Enam langkah dari memilih kendaraan sampai part tiba di rumah atau bengkelmu."
    >
      <ol className="flex flex-col gap-4">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-4 rounded-xl border border-border p-5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-bold text-background tabular-nums">
              {i + 1}
            </span>
            <div className="flex flex-col gap-1">
              <h2 className="text-lg">{s.title}</h2>
              <p className="text-steel-700">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <Button asChild className="mt-8">
        <Link href="/products">Mulai belanja</Link>
      </Button>
    </StaticPage>
  );
}
