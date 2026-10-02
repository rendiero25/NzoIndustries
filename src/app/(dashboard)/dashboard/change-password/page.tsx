import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/legacy/server";
import { ChangePasswordForm } from "@/components/dashboard/change-password-form";

export const metadata: Metadata = {
  title: "Ganti password",
};

export default async function ChangePasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/dashboard/change-password");

  return (
    <div className="w-full">
      <p className="text-[10px] font-bold text-muted-foreground uppercase">Keamanan</p>
      <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">Ganti password</h1>
      <p className="mt-2 text-sm text-steel-700">
        Gunakan password kuat yang belum pernah dipakai di layanan lain.
      </p>
      <div className="mt-10">
        <ChangePasswordForm />
      </div>
    </div>
  );
}
