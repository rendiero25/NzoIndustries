/**
 * Import katalog lewat API Jubelio [P-04] — KERANGKA, menunggu akun integrasi.
 *
 *   pnpm import:jubelio --dry-run
 *
 * Memakai pipeline mapping yang sama dengan export XLS (src/lib/import), lalu
 * staging + RPC import_commit_batch seperti scripts/import-jubelio-export.ts.
 * Foto produk diunggah ke Cloudinary `nzo/products/{sku}` lewat upload remote
 * URL bertanda tangan (belum diaktifkan sampai bentuk respons API terverifikasi).
 */
import {
  apiItemToGroup,
  createJubelioClient,
  fetchAllItemGroups,
} from "../src/lib/import/jubelio-api";
import { mapJubelioGroups } from "../src/lib/import/jubelio-export";
import { describeStaged } from "../src/lib/import/staging";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const baseUrl = process.env.JUBELIO_BASE_URL;
  const email = process.env.JUBELIO_EMAIL;
  const password = process.env.JUBELIO_PASSWORD;
  if (!baseUrl || !email || !password) {
    console.error(
      "JUBELIO_BASE_URL / JUBELIO_EMAIL / JUBELIO_PASSWORD belum diset (menunggu P-04).",
    );
    console.error('Sementara pakai export XLS: pnpm import:export "<file.xls>" --dry-run');
    process.exit(1);
  }
  if (!dryRun) {
    console.error(
      "Mode tulis belum diaktifkan: verifikasi bentuk respons API dengan --dry-run dulu (P-04).",
    );
    process.exit(1);
  }

  const source = createJubelioClient({ baseUrl, email, password });
  const items = await fetchAllItemGroups(source, 100, (n, total) =>
    process.stdout.write(`\r  ambil ${n}/${total}`),
  );
  process.stdout.write("\n");
  const { rows, summary } = mapJubelioGroups(items.map((it, i) => apiItemToGroup(it, i + 1)));
  console.log("Ringkasan:", summary);
  console.log(describeStaged(rows));
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
