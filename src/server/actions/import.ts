"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { checkRole } from "@/lib/auth/guards";
import { mapJubelioGroups } from "@/lib/import/jubelio-export";
import { mapNzoTemplate } from "@/lib/import/nzo-template";
import { toStagingInsert } from "@/lib/import/staging";
import type { ImportSummary, StagedRow } from "@/lib/import/types";
import { createClient } from "@/lib/supabase/server";

/**
 * Import katalog dari halaman admin (fallback & update massal). File diparse
 * di browser (body Vercel maks 4,5 MB), baris dikirim per chunk lalu
 * dipetakan ulang di server dengan modul yang sama dengan script CLI.
 * Semua lewat client user-scoped (RLS owner/admin + audit `auth.uid()`, D-19).
 */
export type ImportActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string };

const ADMIN_ROLES = ["owner", "admin"] as const;
const MAX_CHUNK = 500;

async function guard(): Promise<string | null> {
  const { decision } = await checkRole(ADMIN_ROLES);
  return decision.ok ? null : "Tidak diizinkan.";
}

const createSchema = z.object({
  source: z.enum(["jubelio_export", "csv"]),
  fileName: z.string().trim().min(1).max(200),
});

export async function createImportBatch(
  input: z.infer<typeof createSchema>,
): Promise<ImportActionResult<{ batchId: string }>> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Data batch tidak valid." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("import_batches")
    .insert({ source: parsed.data.source, file_name: parsed.data.fileName, status: "pending" })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "Gagal membuat batch import." };
  return { ok: true, data: { batchId: data.id } };
}

const cell = z.union([z.string().max(2000), z.number(), z.boolean(), z.null()]);

const jubelioGroupSchema = z.object({
  rowIndex: z.number().int().min(1),
  name: z.string().max(2000),
  rows: z
    .array(
      z.object({
        sku: z.string().max(200),
        variant: z.string().max(500).nullable(),
        price: z.number().int().nullable(),
        marketplacePrices: z.record(z.string().max(200), z.number()),
      }),
    )
    .min(1)
    .max(300),
});

const stageJubelioSchema = z.object({
  batchId: z.uuid(),
  groups: z.array(jubelioGroupSchema).min(1).max(MAX_CHUNK),
});

const stageTemplateSchema = z.object({
  batchId: z.uuid(),
  header: z.array(cell).min(1).max(50),
  rows: z.array(z.array(cell).max(50)).min(1).max(MAX_CHUNK),
  rowOffset: z.number().int().min(0),
});

async function insertStaged(batchId: string, rows: StagedRow[], summary: ImportSummary) {
  const supabase = await createClient();
  const { data: batch } = await supabase
    .from("import_batches")
    .select("id, status, total_rows")
    .eq("id", batchId)
    .maybeSingle();
  if (!batch || batch.status !== "pending")
    return { ok: false as const, error: "Batch tidak ditemukan atau sudah diproses." };

  // SKU yang sudah ada di batch ini (chunk sebelumnya) ditandai duplikat.
  const skus = rows.map((r) => r.sku).filter(Boolean);
  const taken = new Set<string>();
  for (let i = 0; i < skus.length; i += 100) {
    // per 100 supaya URL query PostgREST tetap pendek
    const { data: existing } = await supabase
      .from("import_products")
      .select("sku")
      .eq("batch_id", batchId)
      .in("sku", skus.slice(i, i + 100));
    for (const e of existing ?? []) if (e.sku) taken.add(e.sku.toUpperCase());
  }
  for (const r of rows) {
    if (r.status === "valid" && taken.has(r.sku.toUpperCase())) {
      r.status = "invalid";
      r.error = `SKU "${r.sku}" duplikat di file ini`;
      r.mapped = null;
      summary.valid -= 1;
      summary.invalid += 1;
    }
  }

  const { error } = await supabase
    .from("import_products")
    .insert(rows.map((r) => toStagingInsert(batchId, r)));
  if (error) return { ok: false as const, error: "Gagal menyimpan staging." };

  const logs = rows.flatMap((r) => [
    ...(r.status === "invalid"
      ? [{ batch_id: batchId, level: "error", sku: r.sku, message: r.error ?? "invalid" }]
      : []),
    ...r.warnings.map((message) => ({ batch_id: batchId, level: "warn", sku: r.sku, message })),
  ]);
  if (logs.length) await supabase.from("import_logs").insert(logs);

  await supabase
    .from("import_batches")
    .update({ total_rows: batch.total_rows + rows.length })
    .eq("id", batchId);
  return { ok: true as const };
}

export async function stageJubelioGroups(
  input: z.infer<typeof stageJubelioSchema>,
): Promise<ImportActionResult<ImportSummary>> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };
  const parsed = stageJubelioSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Format data import tidak valid." };

  const { rows, summary } = mapJubelioGroups(parsed.data.groups);
  const result = await insertStaged(parsed.data.batchId, rows, summary);
  return result.ok ? { ok: true, data: summary } : result;
}

export async function stageTemplateRows(
  input: z.infer<typeof stageTemplateSchema>,
): Promise<ImportActionResult<ImportSummary>> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };
  const parsed = stageTemplateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Format data import tidak valid." };

  const supabase = await createClient();
  const { data: cats } = await supabase.from("categories").select("slug");
  const known = new Set((cats ?? []).map((c) => c.slug));

  try {
    const { rows, summary } = mapNzoTemplate([parsed.data.header, ...parsed.data.rows], known);
    for (const r of rows) r.row_index += parsed.data.rowOffset;
    const result = await insertStaged(parsed.data.batchId, rows, summary);
    return result.ok ? { ok: true, data: summary } : result;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Template tidak dikenali." };
  }
}

const commitSchema = z.object({ batchId: z.uuid() });

/** Satu putaran commit (maks 200 produk). Client memanggil berulang sampai remaining = 0. */
export async function commitImportBatch(
  input: z.infer<typeof commitSchema>,
): Promise<ImportActionResult<{ committed: number; failed: number; remaining: number }>> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };
  const parsed = commitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Data tidak valid." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("import_commit_batch", {
    p_batch_id: parsed.data.batchId,
    p_limit: 200,
  });
  if (error) return { ok: false, error: "Commit gagal. Coba lagi." };
  const res = data as { committed: number; failed: number; remaining: number };
  if (res.remaining === 0) {
    revalidatePath("/admin/import");
    revalidatePath("/admin/products");
  }
  return { ok: true, data: res };
}
