"use client";

import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Download, FileSpreadsheet, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  ImportFormatError,
  mapJubelioGroups,
  parseJubelioExport,
  type JubelioExportGroup,
  type SheetRow,
} from "@/lib/import/jubelio-export";
import { isNzoTemplate, mapNzoTemplate, NZO_TEMPLATE_CSV } from "@/lib/import/nzo-template";
import type { ImportSummary, StagedRow } from "@/lib/import/types";
import { formatIDR } from "@/lib/money";
import {
  commitImportBatch,
  createImportBatch,
  stageJubelioGroups,
  stageTemplateRows,
} from "@/server/actions/import";

type Parsed =
  | {
      kind: "jubelio";
      fileName: string;
      groups: JubelioExportGroup[];
      preview: StagedRow[];
      summary: ImportSummary;
    }
  | {
      kind: "template";
      fileName: string;
      header: SheetRow;
      rows: SheetRow[];
      preview: StagedRow[];
      summary: ImportSummary;
    };

type Phase =
  | { step: "idle" }
  | { step: "parsing" }
  | { step: "ready" }
  | { step: "staging"; done: number; total: number }
  | { step: "committing"; done: number; total: number }
  | { step: "finished"; committed: number; failed: number };

type Filter = "all" | "valid" | "invalid" | "warn";

const MAX_FILE_BYTES = 60 * 1024 * 1024;
const JUBELIO_CHUNK = 300;
const TEMPLATE_CHUNK = 500;
const num = new Intl.NumberFormat("id-ID");

export function ImportWorkbench({ categorySlugs }: { categorySlugs: string[] }) {
  const router = useRouter();
  const knownCategories = useMemo(() => new Set(categorySlugs), [categorySlugs]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [phase, setPhase] = useState<Phase>({ step: "idle" });
  const [filter, setFilter] = useState<Filter>("all");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dragging, setDragging] = useState(false);

  const busy = phase.step === "parsing" || phase.step === "staging" || phase.step === "committing";

  async function handleFile(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      toast.error("File terlalu besar (maksimal 60 MB).");
      return;
    }
    setPhase({ step: "parsing" });
    setParsed(null);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer(), {
        type: "array",
        cellStyles: false,
        cellHTML: false,
      });
      const sheet = wb.Sheets[wb.SheetNames[0]!];
      if (!sheet) throw new ImportFormatError("File tidak berisi sheet.");
      const rows = XLSX.utils.sheet_to_json<SheetRow>(sheet, {
        header: 1,
        defval: null,
        blankrows: false,
        raw: true,
      });

      if (isNzoTemplate(rows)) {
        const { rows: preview, summary } = mapNzoTemplate(rows, knownCategories);
        setParsed({
          kind: "template",
          fileName: file.name,
          header: rows[0]!,
          rows: rows.slice(1),
          preview,
          summary,
        });
      } else {
        const groups = parseJubelioExport(rows);
        const { rows: preview, summary } = mapJubelioGroups(groups);
        setParsed({ kind: "jubelio", fileName: file.name, groups, preview, summary });
      }
      setFilter("all");
      setPhase({ step: "ready" });
    } catch (err) {
      setPhase({ step: "idle" });
      toast.error(
        err instanceof ImportFormatError
          ? err.message
          : "File tidak bisa dibaca. Pastikan formatnya XLS, XLSX, atau CSV.",
      );
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function runImport() {
    if (!parsed) return;
    setConfirmOpen(false);
    const created = await createImportBatch({
      source: parsed.kind === "jubelio" ? "jubelio_export" : "csv",
      fileName: parsed.fileName.slice(0, 200),
    });
    if (!created.ok) {
      toast.error(created.error);
      return;
    }
    const { batchId } = created.data;

    const total = parsed.kind === "jubelio" ? parsed.groups.length : parsed.rows.length;
    const chunkSize = parsed.kind === "jubelio" ? JUBELIO_CHUNK : TEMPLATE_CHUNK;
    setPhase({ step: "staging", done: 0, total });
    for (let i = 0; i < total; i += chunkSize) {
      const result =
        parsed.kind === "jubelio"
          ? await stageJubelioGroups({
              batchId,
              groups: parsed.groups.slice(i, i + chunkSize).map((g) => ({
                ...g,
                rows: g.rows.map((r) => ({
                  ...r,
                  price: r.price === null ? null : Math.round(r.price),
                })),
              })),
            })
          : await stageTemplateRows({
              batchId,
              header: parsed.header.map(toCell),
              rows: parsed.rows.slice(i, i + chunkSize).map((r) => r.map(toCell)),
              rowOffset: i,
            });
      if (!result.ok) {
        toast.error(result.error);
        setPhase({ step: "ready" });
        return;
      }
      setPhase({ step: "staging", done: Math.min(i + chunkSize, total), total });
    }

    const validTotal = parsed.summary.valid;
    let committed = 0;
    let failed = 0;
    setPhase({ step: "committing", done: 0, total: validTotal });
    for (;;) {
      const result = await commitImportBatch({ batchId });
      if (!result.ok) {
        toast.error(result.error);
        setPhase({ step: "ready" });
        return;
      }
      committed += result.data.committed;
      failed += result.data.failed;
      setPhase({ step: "committing", done: committed + failed, total: validTotal });
      if (result.data.remaining === 0 || result.data.committed + result.data.failed === 0) break;
    }
    setPhase({ step: "finished", committed, failed });
    toast.success(`${num.format(committed)} produk masuk sebagai draft.`);
    router.refresh();
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(
      new Blob([NZO_TEMPLATE_CSV], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "template-import-nzo.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const rows = useMemo(() => {
    if (!parsed) return [];
    switch (filter) {
      case "valid":
        return parsed.preview.filter((r) => r.status === "valid");
      case "invalid":
        return parsed.preview.filter((r) => r.status === "invalid");
      case "warn":
        return parsed.preview.filter((r) => r.warnings.length > 0);
      default:
        return parsed.preview;
    }
  }, [parsed, filter]);

  return (
    <section aria-label="Unggah file import" className="space-y-6">
      {!parsed ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) void handleFile(file);
          }}
          className={`flex flex-col items-center gap-4 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${dragging ? "border-foreground bg-muted" : "border-border"}`}
        >
          <FileSpreadsheet
            className="size-10 text-muted-foreground"
            strokeWidth={1.5}
            aria-hidden
          />
          <div className="space-y-1">
            <p className="font-semibold">
              {phase.step === "parsing"
                ? "Membaca file…"
                : "Tarik file ke sini atau pilih dari komputer"}
            </p>
            <p className="text-sm text-muted-foreground">
              XLS, XLSX, atau CSV, maksimal 60 MB. File dibaca di browser, tidak diunggah utuh.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              type="button"
              onClick={() => inputRef.current?.click()}
              loading={phase.step === "parsing"}
            >
              <Upload />
              Pilih file
            </Button>
            <Button type="button" variant="ghost" onClick={downloadTemplate}>
              <Download />
              Unduh template NZO
            </Button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".xls,.xlsx,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            className="sr-only"
            aria-label="Pilih file import"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 rounded-xl border border-border p-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="font-semibold">{parsed.fileName}</p>
              <p className="text-sm text-muted-foreground">
                {parsed.kind === "jubelio" ? "Export Daftar Harga Jubelio" : "Template NZO"} ·{" "}
                {num.format(parsed.summary.products)} produk
                {parsed.summary.variants
                  ? ` · ${num.format(parsed.summary.variants)} varian`
                  : ""}{" "}
                · {num.format(parsed.summary.valid)} siap · {num.format(parsed.summary.invalid)}{" "}
                gagal · {num.format(parsed.summary.normalizedSkus)} SKU dirapikan
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setParsed(null);
                  setPhase({ step: "idle" });
                }}
              >
                <X />
                Ganti file
              </Button>
              <Button
                type="button"
                disabled={busy || phase.step === "finished" || parsed.summary.valid === 0}
                onClick={() => setConfirmOpen(true)}
              >
                Masukkan sebagai draft
              </Button>
            </div>
          </div>

          {phase.step === "staging" || phase.step === "committing" ? (
            <div className="space-y-2" role="status" aria-live="polite">
              <p className="text-sm font-medium">
                {phase.step === "staging" ? "Menyiapkan data" : "Memasukkan produk"}{" "}
                {num.format(phase.done)} dari {num.format(phase.total)}
              </p>
              <Progress value={phase.total ? (phase.done / phase.total) * 100 : 0} />
            </div>
          ) : null}
          {phase.step === "finished" ? (
            <p role="status" className="rounded-lg bg-muted px-4 py-3 text-sm">
              Selesai: {num.format(phase.committed)} produk masuk sebagai draft
              {phase.failed ? `, ${num.format(phase.failed)} gagal (lihat riwayat import)` : ""}.
              Lengkapi foto, stok, dan berat sebelum dipublikasikan.
            </p>
          ) : null}

          <ToggleGroup
            type="single"
            value={filter}
            onValueChange={(v) => v && setFilter(v as Filter)}
            variant="outline"
            aria-label="Saring baris"
          >
            <ToggleGroupItem value="all">Semua</ToggleGroupItem>
            <ToggleGroupItem value="valid">Siap</ToggleGroupItem>
            <ToggleGroupItem value="invalid">Gagal</ToggleGroupItem>
            <ToggleGroupItem value="warn">Ada catatan</ToggleGroupItem>
          </ToggleGroup>

          <PreviewTable rows={rows} />
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Masukkan ${num.format(parsed?.summary.valid ?? 0)} produk sebagai draft?`}
        description="Produk dengan SKU yang sudah ada akan diperbarui (nama dan harga tidak ditimpa bila sudah diedit admin). Produk baru masuk sebagai draft dengan stok 0."
        confirmLabel="Masukkan"
        onConfirm={() => void runImport()}
      />
    </section>
  );
}

function toCell(v: SheetRow[number]): string | number | boolean | null {
  if (v === undefined || v === null) return null;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") return v.slice(0, 2000);
  return v;
}

function PreviewTable({ rows }: { rows: StagedRow[] }) {
  const columns = useMemo<ColumnDef<StagedRow>[]>(
    () => [
      {
        header: "Baris",
        accessorKey: "row_index",
        cell: (c) => <span className="tabular-nums">{c.getValue<number>()}</span>,
      },
      {
        header: "Status",
        id: "status",
        cell: ({ row }) =>
          row.original.status === "valid" ? (
            <Badge variant="secondary">Siap</Badge>
          ) : (
            <Badge variant="destructive">Gagal</Badge>
          ),
      },
      {
        header: "SKU",
        accessorKey: "sku",
        cell: (c) => <span className="font-mono text-xs">{c.getValue<string>()}</span>,
      },
      {
        header: "Nama",
        id: "name",
        cell: ({ row }) => {
          const m = row.original.mapped;
          const original = String(
            (row.original.raw as { name?: string; nama?: string }).name ??
              (row.original.raw as { nama?: string }).nama ??
              "",
          );
          return (
            <div className="max-w-md space-y-0.5">
              <p className="font-medium">{m?.name ?? original}</p>
              {m && original && m.name !== original ? (
                <p className="line-clamp-1 text-xs text-muted-foreground" title={original}>
                  {original}
                </p>
              ) : null}
            </div>
          );
        },
      },
      {
        header: "Harga",
        id: "price",
        cell: ({ row }) =>
          row.original.mapped ? (
            <span className="tabular-nums">{formatIDR(row.original.mapped.price)}</span>
          ) : (
            "-"
          ),
      },
      {
        header: "Varian",
        id: "variants",
        cell: ({ row }) => row.original.mapped?.variants.length || "-",
      },
      {
        header: "Kategori",
        id: "category",
        cell: ({ row }) => row.original.mapped?.category_slugs[0] ?? "-",
      },
      { header: "Brand", id: "brand", cell: ({ row }) => row.original.mapped?.brand_name ?? "-" },
      {
        header: "Catatan",
        id: "notes",
        cell: ({ row }) => {
          const notes = [row.original.error, ...row.original.warnings].filter(Boolean);
          return notes.length ? (
            <p className="max-w-xs text-xs text-muted-foreground">{notes.join(" · ")}</p>
          ) : null;
        },
      },
    ],
    [],
  );

  // TanStack Table belum kompatibel dengan React Compiler; aman karena tidak dimemo.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 } },
  });

  if (!rows.length)
    return <p className="text-sm text-muted-foreground">Tidak ada baris untuk filter ini.</p>;

  const { pageIndex } = table.getState().pagination;
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((r) => (
              <TableRow key={r.id}>
                {r.getVisibleCells().map((c) => (
                  <TableCell key={c.id} className="align-top">
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">
          Halaman {num.format(pageIndex + 1)} dari {num.format(table.getPageCount())} ·{" "}
          {num.format(rows.length)} baris
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            Sebelumnya
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            Berikutnya
          </Button>
        </div>
      </div>
    </div>
  );
}
