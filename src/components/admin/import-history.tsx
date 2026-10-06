import { FileUp } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Batch = {
  id: string;
  source: string;
  status: string;
  file_name: string | null;
  total_rows: number;
  success_rows: number;
  failed_rows: number;
  skipped_rows: number;
  created_at: string;
  finished_at: string | null;
};

const SOURCE_LABEL: Record<string, string> = {
  jubelio_export: "Export Jubelio",
  jubelio: "API Jubelio",
  csv: "Template NZO",
};

const STATUS: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { label: "Menunggu", variant: "outline" },
  running: { label: "Berjalan", variant: "secondary" },
  completed: { label: "Selesai", variant: "default" },
  failed: { label: "Gagal", variant: "destructive" },
};

const dateFormat = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});
const num = new Intl.NumberFormat("id-ID");

export function ImportHistory({ batches }: { batches: Batch[] }) {
  if (!batches.length) {
    return (
      <EmptyState
        icon={FileUp}
        title="Belum ada import"
        description="Batch import yang kamu jalankan akan muncul di sini."
      />
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Waktu</TableHead>
            <TableHead>File</TableHead>
            <TableHead>Sumber</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Baris</TableHead>
            <TableHead className="text-right">Berhasil</TableHead>
            <TableHead className="text-right">Gagal</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {batches.map((b) => {
            const status = STATUS[b.status] ?? { label: b.status, variant: "outline" as const };
            return (
              <TableRow key={b.id}>
                <TableCell className="whitespace-nowrap">
                  {dateFormat.format(new Date(b.created_at))}
                </TableCell>
                <TableCell className="max-w-64 truncate" title={b.file_name ?? undefined}>
                  {b.file_name ?? "-"}
                </TableCell>
                <TableCell>{SOURCE_LABEL[b.source] ?? b.source}</TableCell>
                <TableCell>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {num.format(b.total_rows)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {num.format(b.success_rows)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {num.format(b.failed_rows)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
