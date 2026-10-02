import Link from "next/link";
import type { ReactNode } from "react";

import { SiteLogo } from "@/components/shared/site-logo";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export type AuthSplitShellProps = {
  /** Kalimat pendek di bawah headline panel kiri, sesuai halaman. */
  note?: string;
  /** Lebar area form, mis. max-w-sm | max-w-md. */
  formMaxWidthClass?: string;
  children: ReactNode;
};

async function fetchModelNames(): Promise<string[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("vehicle_models")
      .select("name, vehicle_makes(name)")
      .order("name")
      .limit(24);
    return (data ?? []).map((m) => {
      const make = Array.isArray(m.vehicle_makes) ? m.vehicle_makes[0] : m.vehicle_makes;
      return make?.name ? `${make.name} ${m.name}` : m.name;
    });
  } catch {
    return [];
  }
}

/**
 * Layout auth NZO: panel kiri hitam (desktop) berisi janji inti toko,
 * "part yang pas untuk kendaraanmu", dengan nama model kendaraan asli dari
 * katalog sebagai tekstur tipografis. Panel kanan: form. Mobile: form saja.
 */
export async function AuthSplitShell({
  note = "Simpan kendaraanmu di Garasi, lalu belanja part yang memang cocok.",
  formMaxWidthClass = "max-w-md",
  children,
}: AuthSplitShellProps) {
  const models = await fetchModelNames();

  return (
    <div className="grid min-h-svh bg-background lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden bg-brand-black text-white lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <SiteLogo variant="authPanel" tone="light" />

        <div className="relative z-10 max-w-md">
          <p className="text-[2.75rem] leading-[1.05] font-extrabold tracking-[-0.03em] text-balance xl:text-[3.25rem]">
            Part yang pas, untuk kendaraan yang kamu kendarai.
          </p>
          <p className="mt-5 max-w-sm text-base leading-7 text-white/65">{note}</p>
        </div>

        {models.length > 0 ? (
          <ul
            aria-label="Contoh kendaraan yang didukung"
            className="relative z-10 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-steel-500"
          >
            {models.map((name) => (
              <li key={name} className="whitespace-nowrap">
                {name}
              </li>
            ))}
          </ul>
        ) : (
          <span />
        )}
      </aside>

      <main className="flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 sm:px-8 sm:pt-8">
          <span className="lg:hidden">
            <SiteLogo variant="authMobile" />
          </span>
          <Link
            href="/"
            className="ml-auto rounded-sm text-sm font-medium text-steel-700 underline-offset-4 hover:text-foreground hover:underline"
          >
            Kembali ke toko
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
          <div className={cn("w-full", formMaxWidthClass)}>{children}</div>
        </div>
      </main>
    </div>
  );
}
