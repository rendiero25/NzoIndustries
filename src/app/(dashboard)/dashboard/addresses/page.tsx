import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/legacy/server";
import { fetchUserAddresses } from "@/lib/data/dashboard-user";
import { Button } from "@/components/ui/button";
import { AddressDeleteButton } from "@/components/dashboard/address-delete-button";

export const metadata: Metadata = {
  title: "Alamat",
};

export default async function AddressesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/dashboard/addresses");

  const rows = await fetchUserAddresses(user.id);

  return (
    <div className="w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold text-[#7a7a7a] uppercase">Pengiriman</p>
          <h1 className="mt-2 text-2xl font-bold text-[#1d1d1f] sm:text-3xl">Alamat tersimpan</h1>
        </div>
        <Button asChild variant="primary" className="w-fit">
          <Link href="/dashboard/addresses/new">Tambah alamat</Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="mt-10 text-sm text-[#5c5c5c]">
          Belum ada alamat. Tambahkan untuk checkout lebih cepat.
        </p>
      ) : (
        <ul className="mt-10 space-y-4">
          {rows.map((a) => (
            <li key={a.id} className="rounded-xl border border-[#e0e0e0] bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  {a.is_default ? (
                    <span className="inline-block rounded-full bg-black px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                      Utama
                    </span>
                  ) : null}
                  {a.label ? (
                    <p className="mt-2 text-xs font-bold text-[#7a7a7a] uppercase">{a.label}</p>
                  ) : null}
                  <p className="mt-1 font-semibold text-[#1d1d1f]">{a.recipient}</p>
                  <p className="text-sm text-[#5c5c5c]">{a.phone}</p>
                  <p className="mt-2 text-sm leading-relaxed text-[#1d1d1f]">
                    {a.full_address}, {a.district}, {a.city}, {a.province} {a.postal_code}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button asChild variant="dark" size="sm">
                    <Link href={`/dashboard/addresses/${a.id}/edit`}>Edit</Link>
                  </Button>
                  <AddressDeleteButton addressId={a.id} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
