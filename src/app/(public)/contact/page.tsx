import { Clock, Mail, MapPin, MessageCircle } from "lucide-react";
import type { Metadata } from "next";

import { StaticPage, whatsappHref } from "@/components/storefront/static-page";
import { Button } from "@/components/ui/button";
import { ContentPageView } from "@/components/storefront/content-page-view";
import { getContentPage } from "@/server/queries/content";

const fallbackMetadata: Metadata = {
  title: "Kontak",
  description:
    "Hubungi CS NZO Industries lewat WhatsApp atau email untuk tanya kecocokan part, stok, dan pesanan.",
  alternates: { canonical: "/contact" },
};

function FallbackContactPage() {
  const wa = whatsappHref("Halo NZO, saya mau tanya part:");
  // TODO [P-09]: email CS resmi setelah domain tersedia (store_settings tidak publik).
  const email: string | null = null;

  return (
    <StaticPage
      title="Kontak"
      lead="Ragu part-nya cocok? Kirim foto part lama atau kode part-nya, CS kami bantu cek."
    >
      <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
        <li className="flex items-start gap-4 p-5">
          <MessageCircle className="mt-0.5 size-5 shrink-0" strokeWidth={1.75} aria-hidden />
          <div className="flex flex-1 flex-col gap-2">
            <p className="font-semibold">WhatsApp</p>
            {wa ? (
              <Button asChild className="w-fit">
                <a href={wa} target="_blank" rel="noopener noreferrer">
                  Chat CS di WhatsApp
                </a>
              </Button>
            ) : (
              <p className="text-steel-700">Nomor WhatsApp CS segera tersedia.</p>
            )}
          </div>
        </li>
        <li className="flex items-start gap-4 p-5">
          <Mail className="mt-0.5 size-5 shrink-0" strokeWidth={1.75} aria-hidden />
          <div className="flex flex-col gap-1">
            <p className="font-semibold">Email</p>
            {email ? (
              <a href={`mailto:${email}`} className="underline-offset-4 hover:underline">
                {email}
              </a>
            ) : (
              <p className="text-steel-700">Alamat email CS segera tersedia.</p>
            )}
          </div>
        </li>
        <li className="flex items-start gap-4 p-5">
          <Clock className="mt-0.5 size-5 shrink-0" strokeWidth={1.75} aria-hidden />
          <div className="flex flex-col gap-1">
            <p className="font-semibold">Jam operasional</p>
            {/* TODO [P-11]: jam operasional dari klien */}
            <p className="text-steel-700">Segera tersedia.</p>
          </div>
        </li>
        <li className="flex items-start gap-4 p-5">
          <MapPin className="mt-0.5 size-5 shrink-0" strokeWidth={1.75} aria-hidden />
          <div className="flex flex-col gap-1">
            <p className="font-semibold">Alamat</p>
            {/* TODO [P-11]: alamat toko/gudang dari klien */}
            <p className="text-steel-700">Segera tersedia.</p>
          </div>
        </li>
      </ul>
    </StaticPage>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getContentPage("contact");
  if (!page) return fallbackMetadata;
  return {
    ...fallbackMetadata,
    title: page.title,
    description: page.metaDescription ?? fallbackMetadata.description,
    robots: undefined,
  };
}

/** Konten dari admin bila sudah tayang (D-39), selain itu teks bawaan. */
export default async function ContactPage() {
  const page = await getContentPage("contact");
  if (page) return <ContentPageView page={page} />;
  return <FallbackContactPage />;
}
