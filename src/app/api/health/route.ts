import { timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { getServerEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

function hasValidBearer(request: NextRequest, secret: string | undefined): boolean {
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

/**
 * Health check publik: tanpa detail env/DB supaya tidak membocorkan info.
 * Dengan `Authorization: Bearer ${CRON_SECRET}`, sekaligus cek koneksi DB.
 */
export async function GET(request: NextRequest) {
  const body: { status: "ok"; time: string; commit: string | null; db?: "ok" | "error" } = {
    status: "ok",
    time: new Date().toISOString(),
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
  };

  if (hasValidBearer(request, process.env.CRON_SECRET)) {
    try {
      getServerEnv();
      const supabase = createAdminClient();
      const { error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
      body.db = error ? "error" : "ok";
    } catch {
      body.db = "error";
    }
  }

  return NextResponse.json(body, { headers: NO_STORE });
}
