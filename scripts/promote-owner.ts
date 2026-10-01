/**
 * Jadikan satu akun sebagai owner pertama (bootstrap RBAC).
 *
 *   pnpm tsx --env-file=.env.local scripts/promote-owner.ts <email>
 *
 * Akun harus sudah daftar dan memverifikasi email. Setelah ini, perubahan role
 * berikutnya dilakukan owner lewat RPC set_user_role (tercatat di audit_logs).
 * Pakai service role: hanya jalankan dari mesin developer, jangan di CI.
 */
import { createClient } from "@supabase/supabase-js";

import type { Database } from "../src/types/database";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error("Pemakaian: pnpm tsx --env-file=.env.local scripts/promote-owner.ts <email>");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diset.");
    process.exit(1);
  }

  const supabase = createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let userId: string | null = null;
  for (let page = 1; page <= 50 && !userId; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`Gagal membaca user: ${error.message}`);
    const found = data.users.find((u) => u.email?.toLowerCase() === email);
    if (found) {
      if (!found.email_confirmed_at) {
        console.error("Email belum diverifikasi. Verifikasi dulu lewat link di email.");
        process.exit(1);
      }
      userId = found.id;
    }
    if (data.users.length < 200) break;
  }

  if (!userId) {
    console.error("User tidak ditemukan. Daftar dulu lewat /register.");
    process.exit(1);
  }

  const { error } = await supabase.from("profiles").update({ role: "owner" }).eq("id", userId);
  if (error) throw new Error(`Gagal update role: ${error.message}`);

  console.log("OK: akun dijadikan owner. Login di /admin/login lalu daftarkan TOTP.");
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
