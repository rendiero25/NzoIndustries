/**
 * Import awal katalog dari export "Daftar Harga" Jubelio (XLS/XLSX).
 *
 *   pnpm import:export "docs/Daftar Harga JUBELIO.xls" --dry-run
 *   pnpm import:export "docs/Daftar Harga JUBELIO.xls" [--limit 500]
 *
 * Alur: parse → mapping (src/lib/import) → import_batches + import_products
 * (staging) → RPC import_commit_batch per chunk → produk `draft`, stok 0.
 * Dry-run tidak menulis ke database; laporan ditulis ke scripts/out/.
 * Pakai service role (D-19): hanya dari mesin developer.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

import {
  mapJubelioGroups,
  parseJubelioExport,
  type SheetRow,
} from "../src/lib/import/jubelio-export";
import { describeStaged, toStagingInsert } from "../src/lib/import/staging";
import type { Database } from "../src/types/database";

const STAGE_CHUNK = 500;
const COMMIT_CHUNK = 500;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diset.");
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

type Supabase = ReturnType<typeof serviceClient>;

async function commitAll(supabase: Supabase, batchId: string) {
  let committed = 0;
  let failed = 0;
  for (;;) {
    const { data, error } = await supabase.rpc("import_commit_batch", {
      p_batch_id: batchId,
      p_limit: COMMIT_CHUNK,
    });
    if (error) throw new Error(`Commit gagal: ${error.message}`);
    const res = data as { committed: number; failed: number; remaining: number };
    committed += res.committed;
    failed += res.failed;
    process.stdout.write(
      `\r  commit ${committed} berhasil, ${failed} gagal, sisa ${res.remaining}   `,
    );
    if (res.remaining === 0 || res.committed + res.failed === 0) break;
  }
  process.stdout.write("\n");
  console.log(
    `Selesai. Batch ${batchId}: ${committed} produk masuk sebagai draft, ${failed} gagal (lihat import_logs).`,
  );
}

async function main() {
  const resume = arg("--resume");
  if (resume) {
    // Lanjutkan baris `valid` yang belum di-commit di batch yang sudah ada.
    await commitAll(serviceClient(), resume);
    return;
  }

  const file = process.argv[2];
  if (!file || file.startsWith("--")) {
    console.error(
      'Pemakaian: pnpm import:export "<file.xls>" [--dry-run] [--limit N] | --resume <batchId>',
    );
    process.exit(1);
  }
  const dryRun = process.argv.includes("--dry-run");
  const limit = arg("--limit") ? Number(arg("--limit")) : undefined;

  console.log(`Membaca ${file} …`);
  const wb = XLSX.read(readFileSync(file), { type: "buffer", cellStyles: false, cellHTML: false });
  const sheet = wb.Sheets[wb.SheetNames[0]!]!;
  const sheetRows = XLSX.utils.sheet_to_json<SheetRow>(sheet, {
    header: 1,
    defval: null,
    blankrows: false,
    raw: true,
  });

  let groups = parseJubelioExport(sheetRows);
  if (limit && limit > 0) groups = groups.slice(0, limit);
  const { rows, summary } = mapJubelioGroups(groups);
  const dist = describeStaged(rows);

  const sample = rows
    .filter((r) => r.mapped)
    .filter((_, i) => i % Math.max(1, Math.floor(rows.length / 25)) === 0)
    .slice(0, 25)
    .map((r) => ({
      sku: r.sku,
      before: String((r.raw as { name?: string }).name ?? ""),
      after: r.mapped!.name,
      kategori: r.mapped!.category_slugs[0],
      brand: r.mapped!.brand_name,
    }));

  const report = {
    file: basename(file),
    dryRun,
    summary,
    ...dist,
    invalid: rows
      .filter((r) => r.status === "invalid")
      .map((r) => ({ row: r.row_index, sku: r.sku, error: r.error })),
    sample,
  };
  mkdirSync("scripts/out", { recursive: true });
  const reportPath = join(
    "scripts/out",
    `import-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log("Ringkasan:", summary);
  console.log("Produk dengan brand:", dist.withBrand, "| dengan saran fitment:", dist.withFitment);
  console.log("Kategori:", dist.categories);
  console.log(`Laporan lengkap: ${reportPath}`);

  if (dryRun) {
    console.log("Dry-run: tidak ada yang ditulis ke database.");
    return;
  }

  const supabase = serviceClient();

  const { data: batch, error: batchError } = await supabase
    .from("import_batches")
    .insert({
      source: "jubelio_export",
      file_name: basename(file),
      total_rows: rows.length,
      status: "pending",
    })
    .select("id")
    .single();
  if (batchError || !batch) throw new Error(`Gagal membuat batch: ${batchError?.message}`);
  console.log(`Batch ${batch.id}: staging ${rows.length} baris …`);

  for (let i = 0; i < rows.length; i += STAGE_CHUNK) {
    const chunk = rows.slice(i, i + STAGE_CHUNK).map((r) => toStagingInsert(batch.id, r));
    const { error } = await supabase.from("import_products").insert(chunk);
    if (error) throw new Error(`Gagal staging baris ${i + 1}: ${error.message}`);
    process.stdout.write(`\r  staging ${Math.min(i + STAGE_CHUNK, rows.length)}/${rows.length}`);
  }
  process.stdout.write("\n");

  const warnLogs = rows.flatMap((r) =>
    r.warnings.map((message) => ({ batch_id: batch.id, level: "warn", sku: r.sku, message })),
  );
  const errLogs = rows
    .filter((r) => r.status === "invalid")
    .map((r) => ({
      batch_id: batch.id,
      level: "error",
      sku: r.sku,
      message: r.error ?? "invalid",
    }));
  const logs = [...errLogs, ...warnLogs];
  for (let i = 0; i < logs.length; i += 1000) {
    const { error } = await supabase.from("import_logs").insert(logs.slice(i, i + 1000));
    if (error) throw new Error(`Gagal menulis log: ${error.message}`);
  }

  await commitAll(supabase, batch.id);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
