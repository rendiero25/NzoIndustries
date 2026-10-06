import type { Metadata } from "next";
import Link from "next/link";

import { StaticPage } from "@/components/storefront/static-page";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Pertanyaan yang sering diajukan tentang kecocokan part, pembayaran, pengiriman, dan retur di NZO Industries.",
  alternates: { canonical: "/faq" },
};

// Jawaban kebijakan (retur, garansi, pembayaran) mengikuti dokumen resmi klien [P-02][P-08].
const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "Bagaimana cara tahu part ini cocok untuk kendaraan saya?",
    a: (
      <>
        Pilih kendaraanmu di Garasi (header atau beranda). Part yang sudah diverifikasi tim kami
        bertanda perisai &ldquo;Cocok&rdquo;. Part yang bertuliskan &ldquo;Disebut untuk …&rdquo;
        menyebut kendaraanmu di deskripsinya tapi belum diverifikasi; tanyakan CS bila ragu.
      </>
    ),
  },
  {
    q: "Apa beda genuine parts dan aftermarket?",
    a: "Genuine parts dibuat atau disetujui pabrikan kendaraan (misalnya Honda HGP, Yamaha YGP). Aftermarket dibuat produsen lain dengan spesifikasi setara atau modifikasi. Brand setiap produk tercantum di halaman produk.",
  },
  {
    q: "Apakah saya perlu akun untuk belanja?",
    a: "Kamu bisa melihat katalog dan menyimpan barang ke keranjang tanpa akun. Untuk checkout, menyimpan wishlist, dan melacak pesanan, kamu perlu masuk atau daftar.",
  },
  {
    q: "Metode pembayaran apa saja yang tersedia?",
    a: "Metode pembayaran ditampilkan saat checkout. Daftar lengkapnya akan diumumkan sebelum toko dibuka.",
  },
  {
    q: "Berapa lama pengiriman?",
    a: "Ongkos dan estimasi waktu kirim dihitung otomatis saat checkout sesuai alamat dan kurir yang kamu pilih.",
  },
  {
    q: "Bagaimana kalau part yang datang tidak cocok?",
    a: (
      <>
        Ajukan retur dari halaman pesanan sesuai{" "}
        <Link href="/kebijakan-pengembalian" className="underline underline-offset-4">
          kebijakan pengembalian
        </Link>
        . Simpan kemasan dan jangan pasang part yang ingin diretur.
      </>
    ),
  },
];

export default function FaqPage() {
  return (
    <StaticPage
      title="Pertanyaan yang sering diajukan"
      lead="Belum menemukan jawabannya? Tanya CS lewat halaman kontak."
    >
      <Accordion type="single" collapsible className="rounded-xl border border-border px-5">
        {FAQ.map((item, i) => (
          <AccordionItem key={item.q} value={`q-${i}`}>
            <AccordionTrigger className="py-5 text-left text-base font-semibold">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="pb-5 leading-7 text-steel-700">{item.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </StaticPage>
  );
}
