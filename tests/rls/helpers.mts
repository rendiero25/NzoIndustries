// Helper test RLS: membuat user per role di project dev, sesi aal2 via TOTP.
// Password & secret hanya di memori; tidak pernah dicetak.
import { createHmac, randomBytes } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../src/types/database.ts";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type Client = SupabaseClient<Database>;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey) {
  throw new Error("Env Supabase belum lengkap (.env.local)");
}

const noSession = { auth: { autoRefreshToken: false, persistSession: false } };

export const admin: Client = createClient<Database>(url, serviceKey, noSession);
export const anon = (): Client => createClient<Database>(url, anonKey, noSession);

export const RUN_ID = randomBytes(4).toString("hex");

export type TestUser = { id: string; email: string; role: AppRole; client: Client };

const created: string[] = [];

function base32Decode(input: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = input.replace(/=+$/, "").toUpperCase().replace(/\s/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = alphabet.indexOf(ch);
    if (idx < 0) throw new Error("secret TOTP tidak valid");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function totp(secret: string, now = Date.now()): string {
  const counter = Math.floor(now / 1000 / 30);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", base32Decode(secret)).update(buf).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return code.toString().padStart(6, "0");
}

export async function createTestUser(
  role: AppRole,
  opts: { mfa?: boolean } = {},
): Promise<TestUser> {
  const email = `rls-${role}-${RUN_ID}-${randomBytes(3).toString("hex")}@nzo-rls.test`;
  const password = `${randomBytes(18).toString("base64url")}Aa1!`;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createUser gagal: ${error?.message}`);
  created.push(data.user.id);

  if (role !== "customer") {
    const { error: roleError } = await admin
      .from("profiles")
      .update({ role })
      .eq("id", data.user.id);
    if (roleError) throw new Error(`set role gagal: ${roleError.message}`);
  }

  const client = anon();
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error(`signIn gagal: ${signInError.message}`);

  if (opts.mfa) {
    const enrolled = await client.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `rls-${RUN_ID}`,
    });
    if (enrolled.error) throw new Error(`enroll gagal: ${enrolled.error.message}`);
    const verified = await client.auth.mfa.challengeAndVerify({
      factorId: enrolled.data.id,
      code: totp(enrolled.data.totp.secret),
    });
    if (verified.error) throw new Error(`verify TOTP gagal: ${verified.error.message}`);
  }

  return { id: data.user.id, email, role, client };
}

export async function cleanupUsers(): Promise<void> {
  for (const id of created.splice(0)) {
    await admin.from("orders").delete().eq("user_id", id);
    const { data: files } = await admin.storage.from("payment-proofs").list(id);
    if (files?.length) {
      await admin.storage.from("payment-proofs").remove(files.map((f) => `${id}/${f.name}`));
    }
    await admin.auth.admin.deleteUser(id);
  }
}
