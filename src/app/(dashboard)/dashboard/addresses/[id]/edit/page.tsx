import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/legacy/server";
import { fetchAddressForUser } from "@/lib/data/dashboard-user";
import { AddressForm } from "@/components/dashboard/address-form";

export const metadata: Metadata = {
  title: "Edit alamat",
};

export default async function EditAddressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirectTo=/dashboard/addresses/${id}/edit`);

  const row = await fetchAddressForUser(user.id, id);
  if (!row) notFound();

  return (
    <div className="w-full">
      <p className="text-[10px] font-bold text-muted-foreground uppercase">Alamat</p>
      <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">Edit alamat</h1>
      <div className="mt-10">
        <AddressForm mode="edit" initial={row} />
      </div>
    </div>
  );
}
