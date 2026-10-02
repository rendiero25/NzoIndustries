import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/legacy/server";
import { AddressForm } from "@/components/dashboard/address-form";

export const metadata: Metadata = {
  title: "Tambah alamat",
};

export default async function NewAddressPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/dashboard/addresses/new");

  return (
    <div className="w-full">
      <p className="text-[10px] font-bold text-muted-foreground uppercase">Alamat baru</p>
      <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">Tambah alamat</h1>
      <div className="mt-10">
        <AddressForm mode="create" />
      </div>
    </div>
  );
}
