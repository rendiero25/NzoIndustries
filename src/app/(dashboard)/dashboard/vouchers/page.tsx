import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Image from "next/image";

import { createClient } from "@/lib/supabase/server";
import { fetchActiveCouponsForStore } from "@/lib/data/dashboard-user";
import { formatDate, formatRupiah } from "@/lib/format";

export const metadata: Metadata = {
  title: "Voucher",
};

function couponTypeLabel(type: string): string {
  if (type === "percentage") return "Diskon persen";
  if (type === "fixed") return "Potongan nominal";
  return type;
}

export default async function VouchersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/dashboard/vouchers");

  const coupons = await fetchActiveCouponsForStore();

  return (
    <div className="w-full">
      <p className="text-[10px] font-bold text-[#7a7a7a] uppercase">Promo</p>
      <h1 className="mt-2 text-2xl font-bold text-[#1d1d1f] sm:text-3xl">Voucher aktif</h1>
      <p className="mt-2 text-sm text-[#5c5c5c]">
        Gunakan kode saat checkout sesai syarat minimum belanja.
      </p>

      {coupons.length === 0 ? (
        <p className="mt-10 text-sm text-[#5c5c5c]">Saat ini tidak ada kode promo publik.</p>
      ) : (
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {coupons.map((c) => (
            <li
              key={c.id}
              className="flex overflow-hidden rounded-xl border border-[#e0e0e0] bg-white"
            >
              <div className="flex-1 p-5">
                <p className="font-mono text-lg font-black text-[#EA5329]">{c.code}</p>
                <p className="mt-2 text-xs font-semibold text-[#7a7a7a] uppercase">
                  {couponTypeLabel(c.type)}
                </p>
                <p className="mt-2 text-sm text-[#1d1d1f]">
                  Nilai:{" "}
                  <span className="font-bold">
                    {c.type === "percentage" ? `${c.value}%` : formatRupiah(c.value)}
                  </span>
                </p>
                <p className="mt-1 text-xs text-[#5c5c5c]">
                  Min. belanja {formatRupiah(c.min_purchase)}
                </p>
                {c.max_discount != null ? (
                  <p className="text-xs text-[#5c5c5c]">
                    Maks. diskon {formatRupiah(c.max_discount)}
                  </p>
                ) : null}
                <p className="mt-3 text-xs text-[#7a7a7a]">
                  {c.valid_from ? `Mulai ${formatDate(c.valid_from)}` : null}
                  {c.valid_until ? ` · s/d ${formatDate(c.valid_until)}` : null}
                </p>
                <p className="mt-2 text-xs text-[#7a7a7a]">
                  Pemakaian: {c.used_count}
                  {c.max_usage != null ? ` / ${c.max_usage}` : ""}
                </p>
              </div>
              {c.image_url && (
                <div className="shrink-0 overflow-hidden bg-[#f5f4f0]">
                  <Image
                    src={c.image_url}
                    alt={c.title ?? c.code}
                    width={200}
                    height={200}
                    className="h-full w-auto object-cover"
                    sizes="200px"
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
