"use client";

import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { AddressDialog } from "@/components/storefront/address-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteAddress, setDefaultAddress } from "@/server/actions/address";
import type { SavedAddress } from "@/server/queries/checkout";

/** Buku alamat: tambah/ubah (AddressDialog), hapus, jadikan utama. */
export function AddressBook({ addresses }: { addresses: SavedAddress[] }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<{ open: boolean; edit: SavedAddress | null }>({
    open: false,
    edit: null,
  });
  const [toDelete, setToDelete] = useState<SavedAddress | null>(null);
  const [pending, start] = useTransition();

  const add = () => setDialog({ open: true, edit: null });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button onClick={add}>
          <Plus className="size-4" /> Tambah alamat
        </Button>
      </div>

      {addresses.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Belum ada alamat"
          description="Simpan alamat supaya checkout lebih cepat."
          action={{ label: "Tambah alamat", onClick: add }}
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id} className="flex flex-col gap-3 rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold">{a.recipient}</span>
                <span className="text-muted-foreground">{a.phone}</span>
                {a.label ? <Badge variant="secondary">{a.label}</Badge> : null}
                {a.isDefault ? <Badge variant="outline">Utama</Badge> : null}
              </div>
              <p className="text-sm text-muted-foreground">
                {a.fullAddress}, {a.district}, {a.city}, {a.province} {a.postalCode}
              </p>
              <div className="mt-auto flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDialog({ open: true, edit: a })}
                >
                  <Pencil className="size-4" /> Ubah
                </Button>
                {!a.isDefault ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const res = await setDefaultAddress({ id: a.id });
                        if (!res.ok) toast.error(res.error ?? "Gagal menyimpan.");
                        else toast.success("Alamat utama diperbarui");
                        router.refresh();
                      })
                    }
                  >
                    Jadikan utama
                  </Button>
                ) : null}
                <Button size="sm" variant="destructive-ghost" onClick={() => setToDelete(a)}>
                  <Trash2 className="size-4" /> Hapus
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AddressDialog
        open={dialog.open}
        initial={dialog.edit}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        onSaved={() => router.refresh()}
      />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Hapus alamat ini?"
        description={toDelete ? `${toDelete.recipient}, ${toDelete.city}` : undefined}
        confirmLabel="Hapus alamat"
        variant="destructive"
        isLoading={pending}
        onConfirm={() =>
          start(async () => {
            if (!toDelete) return;
            const res = await deleteAddress({ id: toDelete.id });
            if (!res.ok) {
              toast.error(res.error ?? "Gagal menghapus.");
              return;
            }
            toast.success("Alamat dihapus");
            setToDelete(null);
            router.refresh();
          })
        }
      />
    </div>
  );
}
