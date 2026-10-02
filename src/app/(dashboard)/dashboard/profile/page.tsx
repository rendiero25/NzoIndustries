import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/legacy/server";
import { fetchUserProfile } from "@/lib/data/dashboard-user";
import { ProfileForm } from "@/components/dashboard/profile-form";

export const metadata: Metadata = {
  title: "Profil",
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/dashboard/profile");

  const profile = await fetchUserProfile(user.id);
  if (!profile) redirect("/login?redirectTo=/dashboard/profile");

  return (
    <div className="w-full">
      <p className="text-[10px] font-bold text-muted-foreground uppercase">Akun</p>
      <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">Profil</h1>
      <p className="mt-2 text-sm text-steel-700">{user.email}</p>
      <div className="mt-10">
        <ProfileForm profile={profile} />
      </div>
    </div>
  );
}
