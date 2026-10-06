import Link from "next/link";
import type { ReactNode } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

/** Kerangka halaman statis (tentang, kontak, FAQ, cara belanja). */
export function StaticPage({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <div className="nzo-container py-8 md:py-12">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Beranda</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <header className="mb-10 flex max-w-3xl flex-col gap-3">
        <h1 className="text-[1.75rem] leading-9 md:text-[2.5rem] md:leading-[3rem]">{title}</h1>
        {lead ? <p className="text-lg text-steel-700">{lead}</p> : null}
      </header>
      <div className="max-w-3xl">{children}</div>
    </div>
  );
}

export function whatsappHref(text?: string): string | null {
  const wa = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "");
  if (!wa) return null;
  return `https://wa.me/${wa}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
