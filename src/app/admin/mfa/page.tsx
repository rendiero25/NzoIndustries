import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MfaForm } from "@/components/admin/mfa-form";
import { getStaffMfaRequired, requireStaff } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Verifikasi Dua Langkah — Admin",
  robots: { index: false, follow: false },
};

export default async function AdminMfaPage() {
  // Staf boleh masuk halaman ini dengan aal1. Bila MFA tidak diwajibkan (D-20)
  // atau sesi sudah aal2, langsung ke panel.
  const user = await requireStaff({ requireMfa: false });
  if (user.aal === "aal2" || !(await getStaffMfaRequired())) redirect("/admin");

  return (
    <main className="flex min-h-svh items-center justify-center bg-steel-50 px-5 py-12">
      <div className="w-full max-w-sm rounded-xl border border-border bg-background p-6 sm:p-8">
        <MfaForm />
      </div>
    </main>
  );
}
