import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, Mail, MapPin, Clock } from "lucide-react";
import { ContactForm } from "@/components/contact/contact-form";
import { Button } from "@/components/ui/button";
import { getStoreOrigin, getWhatsappCs } from "@/lib/settings/queries";
import { getStoreOriginFullAddress, getStoreOriginMapsUrl } from "@/lib/settings/store-origin";
import { LEGAL_ENTITY_NAME } from "@/lib/constants/business-identity";

export const metadata: Metadata = {
  title: "Tentang NZO Industries",
  description:
    "NZO Industries adalah toko tech & gadget terpercaya dengan produk original bergaransi resmi. Melayani lebih dari 3.500 pelanggan setia di seluruh Indonesia.",
};

const stats = [
  { value: "107+", label: "Produk Original" },
  { value: "3.565", label: "Pelanggan Setia" },
  { value: "23.000+", label: "Transaksi Selesai" },
  { value: "100%", label: "Garansi Resmi" },
];

const values = [
  {
    title: "Produk Original",
    description:
      "Setiap produk yang kami jual adalah barang original bergaransi resmi dari distributor resmi. Tidak ada kompromi soal keaslian.",
  },
  {
    title: "Harga Transparan",
    description:
      "Harga yang kami tampilkan adalah harga final. Tidak ada biaya tersembunyi, tidak ada kejutan saat checkout.",
  },
  {
    title: "Pengiriman Cepat",
    description:
      "Kami bermitra dengan kurir terpercaya untuk memastikan produk sampai ke tanganmu dengan aman dan tepat waktu.",
  },
  {
    title: "Pelayanan Tulus",
    description:
      "Tim kami siap membantu dari konsultasi produk hingga after-sales. Kepuasanmu adalah ukuran keberhasilan kami.",
  },
];

export default async function AboutPage() {
  const [storeOrigin, whatsappCs] = await Promise.all([getStoreOrigin(), getWhatsappCs()]);
  const fullAddress = getStoreOriginFullAddress(storeOrigin);

  const contactChannels = [
    {
      icon: MessageCircle,
      title: "WhatsApp",
      description: "Chat langsung dengan tim kami",
      value: whatsappCs ? `+${whatsappCs}` : "Belum diatur",
      href: whatsappCs ? `https://wa.me/${whatsappCs}` : "#",
      label: "Buka WhatsApp",
    },
    {
      icon: Mail,
      title: "Email",
      description: "Kirim email pertanyaanmu",
      value: "support@nzo-industries.test",
      href: "mailto:support@nzo-industries.test",
      label: "Kirim Email",
    },
    {
      icon: MapPin,
      title: "Lokasi",
      description: "Kunjungi showroom kami",
      value: fullAddress || "Belum diatur",
      href: getStoreOriginMapsUrl(storeOrigin),
      label: "Lihat Peta",
    },
    {
      icon: Clock,
      title: "Jam Operasional",
      description: "Kami siap melayani",
      value: "Senin - Minggu, 09:00 - 21:00",
      href: null,
      label: null,
    },
  ];

  return (
    <div className="bg-white">
      {/* Hero — light tile */}
      <section className="w-full bg-white px-6 py-20 text-center md:pt-[80px] md:pb-0">
        <div className="mx-auto max-w-[980px]">
          <p className="mb-4 text-[14px] font-semibold text-[#EA5329]">Tentang Kami</p>
          <h1 className="mb-6 text-[28px] leading-[1.07] font-semibold text-[#1d1d1f] sm:text-[40px] lg:text-[56px]">
            Gadget terbaik,
            <br className="hidden sm:block" /> di tangan yang tepat.
          </h1>
          <p className="text-[#1d1d1f][#cccccc] mx-auto max-w-[600px] text-[17px] leading-[1.5] font-light">
            NZO Industries hadir untuk memastikan semua orang bisa mengakses teknologi terbaik
            dengan mudah, aman, dan terpercaya.
          </p>
          <p className="mt-4 mb-6 text-[17px] font-black text-black">
            Dioperasikan oleh {LEGAL_ENTITY_NAME}.
          </p>
        </div>
      </section>

      {/* Story — dark tile */}
      <section className="w-full bg-[#272729] px-6 py-[80px]">
        <div className="mx-auto grid max-w-[980px] items-center gap-12 md:grid-cols-2">
          <div>
            <p className="mb-4 text-[14px] font-semibold text-[#FFAD88]">Cerita Kami</p>
            <h2 className="mb-6 text-[34px] leading-[1.1] font-semibold text-white">
              Berawal dari passion,
              <br /> berkembang bersama kepercayaan.
            </h2>
            <p className="mb-4 text-[17px] leading-[1.47] font-normal text-[#cccccc]">
              NZO Industries dimulai dari kecintaan mendalam terhadap teknologi dan keinginan untuk
              berbagi akses ke gadget terbaik dengan harga yang adil. Kami memulai perjalanan di
              Tokopedia dan membangun kepercayaan satu per satu bersama pelanggan kami.
            </p>
            <p className="text-[17px] leading-[1.47] font-normal text-[#cccccc]">
              Kini, dengan lebih dari 23.000 transaksi yang telah diselesaikan, kami hadir dengan
              platform sendiri untuk memberikan pengalaman belanja yang lebih baik — lebih cepat,
              lebih personal, dan lebih terpercaya.
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-[18px] bg-[#2a2a2c] p-6 text-center">
                <p className="mb-2 text-[40px] leading-[1.1] font-semibold text-white">
                  {stat.value}
                </p>
                <p className="text-[14px] font-normal text-[#cccccc]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values — parchment tile */}
      <section className="bg-[#f5f5f7][#1a1a1a] w-full px-6 py-[80px]">
        <div className="mx-auto max-w-[980px]">
          <div className="mb-12 text-center">
            <p className="mb-4 text-[14px] font-semibold text-[#EA5329]">Nilai Kami</p>
            <h2 className="text-[34px] leading-[1.1] font-semibold text-[#1d1d1f]">
              Mengapa memilih NZO Industries?
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {values.map((value) => (
              <div
                key={value.title}
                className="bg-white[#272729] border-[#e0e0e0][#3a3a3a] rounded-[18px] border p-6"
              >
                <h3 className="mb-3 text-[17px] leading-[1.24] font-semibold text-[#1d1d1f]">
                  {value.title}
                </h3>
                <p className="text-[#7a7a7a][#cccccc] text-[17px] leading-[1.47] font-normal">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission — dark tile */}
      <section className="w-full bg-[#252527] px-6 py-[80px] text-center">
        <div className="mx-auto max-w-[680px]">
          <p className="mb-4 text-[14px] font-semibold text-[#FFAD88]">Misi Kami</p>
          <h2 className="mb-6 text-[34px] leading-[1.1] font-semibold text-white">
            Mendekatkan teknologi ke semua orang.
          </h2>
          <p className="mx-auto max-w-[560px] text-[17px] leading-[1.5] font-light text-[#cccccc]">
            Kami percaya bahwa teknologi yang tepat dapat mengubah cara kamu bekerja, berkreasi, dan
            menikmati hidup. Itulah mengapa kami berkomitmen untuk selalu menghadirkan produk
            terbaik, dukungan tulus, dan pengalaman belanja yang menyenangkan.
          </p>
        </div>
      </section>

      {/* Contact Channels — dark tile */}
      <section id="kontak" className="w-full scroll-mt-20 bg-[#272729] px-6 py-[80px]">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-12 text-center">
            <p className="mb-4 text-[14px] font-semibold text-[#FFAD88]">Cara Menghubungi</p>
            <h2 className="text-[34px] leading-[1.1] font-semibold text-white">
              Pilih cara komunikasi yang paling mudah
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {contactChannels.map((channel) => {
              const Icon = channel.icon;
              return (
                <a
                  key={channel.title}
                  href={channel.href ?? undefined}
                  className="group rounded-[18px] bg-[#2a2a2c] p-6 transition-colors hover:bg-[#333335]"
                >
                  <div className="mb-4">
                    <Icon className="h-8 w-8 text-[#FFAD88]" />
                  </div>
                  <h3 className="mb-2 text-[17px] font-semibold text-white">{channel.title}</h3>
                  <p className="mb-3 text-[14px] font-normal text-[#cccccc]">
                    {channel.description}
                  </p>
                  <p className="mb-4 text-[14px] font-semibold text-[#FFAD88]">{channel.value}</p>
                  {channel.label && (
                    <span className="text-[14px] font-normal text-brand transition-colors group-hover:text-brand-hover">
                      {channel.label} →
                    </span>
                  )}
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contact Form — light tile */}
      <section className="w-full bg-white px-6 py-[80px]">
        <div className="mx-auto max-w-[600px]">
          <div className="mb-12 text-center">
            <p className="mb-4 text-[14px] font-semibold text-[#EA5329]">Formulir Kontak</p>
            <h2 className="mb-3 text-[34px] leading-[1.1] font-semibold text-[#1d1d1f]">
              Kirim pesan ke kami
            </h2>
            <p className="text-[#7a7a7a][#cccccc] text-[17px] leading-[1.47] font-normal">
              Isi form di bawah dan kami akan membalas dalam waktu singkat.
            </p>
          </div>

          <ContactForm />
        </div>
      </section>

      {/* CTA — white tile */}
      <section className="w-full bg-white px-6 py-[80px] text-center">
        <div className="mx-auto max-w-[680px]">
          <h2 className="mb-4 text-[40px] leading-[1.1] font-semibold text-[#1d1d1f]">
            Siap eksplor koleksi kami?
          </h2>
          <p className="text-[#1d1d1f][#cccccc] mb-8 text-[21px] leading-[1.19] font-normal">
            107 produk tech & gadget original menunggumu.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild variant="primary">
              <Link href="/products">Lihat Semua Produk</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="#kontak">Hubungi Kami</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
