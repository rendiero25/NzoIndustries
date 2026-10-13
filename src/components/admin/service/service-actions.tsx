"use client";

import { Ban, CircleCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { nativeSelectClass } from "@/components/admin/form-styles";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CLAIM_STATUS_META, RETURN_STATUS_META } from "@/lib/orders/status";
import {
  CLAIM_TRANSITIONS,
  NEEDS_RESOLUTION,
  RETURN_TRANSITIONS,
} from "@/lib/validations/admin-service";
import { setAfterSalesStatus, setCustomerBlocked } from "@/server/actions/admin/service";

/** Blokir/buka blokir pelanggan. Pelanggan terblokir tidak bisa checkout atau login. */
export function BlockCustomerButton({
  userId,
  blocked,
  name,
}: {
  userId: string;
  blocked: boolean;
  name: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const confirm = () =>
    start(async () => {
      const res = await setCustomerBlocked(userId, !blocked);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(blocked ? "Blokir dibuka." : "Pelanggan diblokir.");
      setOpen(false);
      router.refresh();
    });

  return (
    <>
      <Button variant={blocked ? "outline" : "destructive"} onClick={() => setOpen(true)}>
        {blocked ? <CircleCheck /> : <Ban />} {blocked ? "Buka blokir" : "Blokir"}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={blocked ? `Buka blokir ${name}?` : `Blokir ${name}?`}
        description={
          blocked
            ? "Pelanggan bisa masuk dan berbelanja lagi."
            : "Pelanggan tidak bisa masuk dan berbelanja. Riwayat pesanan tetap tersimpan."
        }
        confirmLabel={blocked ? "Buka blokir" : "Blokir"}
        variant={blocked ? "default" : "destructive"}
        isLoading={pending}
        onConfirm={confirm}
      />
    </>
  );
}

/** Ubah status retur/klaim sesuai matriks transisi (sama dengan RPC). */
export function AfterSalesStatusForm({
  kind,
  id,
  status,
  adminNote,
  resolution,
}: {
  kind: "return" | "claim";
  id: string;
  status: string;
  adminNote: string | null;
  resolution: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const options = (kind === "return" ? RETURN_TRANSITIONS : CLAIM_TRANSITIONS)[status] ?? [];
  const meta = kind === "return" ? RETURN_STATUS_META : CLAIM_STATUS_META;
  const [next, setNext] = useState(options[0] ?? "");
  const [note, setNote] = useState(adminNote ?? "");
  const [res, setRes] = useState(resolution ?? "");

  if (!options.length) {
    return (
      <Card>
        <CardContent className="p-5 text-sm text-muted-foreground">
          Status sudah final. Tidak ada aksi lanjutan.
        </CardContent>
      </Card>
    );
  }

  const needsResolution = NEEDS_RESOLUTION.has(next);

  const submit = () =>
    start(async () => {
      const result = await setAfterSalesStatus({ kind, id, status: next, note, resolution: res });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Status jadi "${meta[next]?.label ?? next}". Pelanggan diberi notifikasi.`);
      router.refresh();
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ubah status</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="as-status">Status berikutnya</Label>
          <select
            id="as-status"
            className={nativeSelectClass}
            value={next}
            onChange={(e) => setNext(e.target.value)}
          >
            {options.map((o) => (
              <option key={o} value={o}>
                {meta[o]?.label ?? o}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="as-note">Catatan untuk pelanggan (opsional)</Label>
          <Textarea
            id="as-note"
            rows={3}
            maxLength={1000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <span className="text-caption text-muted-foreground">
            Tampil di halaman retur pelanggan, misalnya alamat kirim balik.
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="as-res">Resolusi {needsResolution ? "(wajib)" : "(opsional)"}</Label>
          <Textarea
            id="as-res"
            rows={3}
            maxLength={1000}
            value={res}
            onChange={(e) => setRes(e.target.value)}
          />
        </div>
        <Button
          onClick={submit}
          disabled={pending || (needsResolution && !res.trim())}
          className="self-start"
        >
          {pending ? "Menyimpan…" : "Simpan status"}
        </Button>
      </CardContent>
    </Card>
  );
}
