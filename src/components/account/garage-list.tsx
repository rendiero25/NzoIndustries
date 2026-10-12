"use client";

import { Bike, Car, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { removeVehicle, setDefaultVehicle } from "@/server/actions/account/garage";
import type { MyVehicle } from "@/server/queries/account";

/** Daftar kendaraan Garasi: aktifkan (cookie + default) atau hapus. */
export function GarageList({
  vehicles,
  active,
}: {
  vehicles: MyVehicle[];
  active: { modelId: string; year: number } | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [toDelete, setToDelete] = useState<MyVehicle | null>(null);

  return (
    <>
      <ul className="grid gap-3 md:grid-cols-2">
        {vehicles.map((v) => {
          const isActive = active?.modelId === v.modelId && active.year === v.year;
          const Icon = v.type === "car" ? Car : Bike;
          return (
            <li key={v.id} className="flex items-center gap-3 rounded-xl border border-border p-4">
              <Icon className="size-6 shrink-0 text-steel-700" strokeWidth={1.75} aria-hidden />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate text-sm font-semibold">{v.label}</span>
                <span className="flex gap-1.5">
                  {isActive ? <Badge>Aktif</Badge> : null}
                  {v.isDefault && !isActive ? <Badge variant="outline">Utama</Badge> : null}
                </span>
              </div>
              {!isActive ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const res = await setDefaultVehicle({ id: v.id });
                      if (!res.ok) toast.error(res.error);
                      else toast.success(`${v.label} jadi kendaraan aktif`);
                      router.refresh();
                    })
                  }
                >
                  Aktifkan
                </Button>
              ) : null}
              <Button
                size="icon-sm"
                variant="destructive-ghost"
                aria-label={`Hapus ${v.label}`}
                onClick={() => setToDelete(v)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          );
        })}
      </ul>
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Hapus dari Garasi?"
        description={toDelete?.label}
        confirmLabel="Hapus kendaraan"
        variant="destructive"
        isLoading={pending}
        onConfirm={() =>
          start(async () => {
            if (!toDelete) return;
            const res = await removeVehicle({ id: toDelete.id });
            if (!res.ok) {
              toast.error(res.error);
              return;
            }
            toast.success("Kendaraan dihapus");
            setToDelete(null);
            router.refresh();
          })
        }
      />
    </>
  );
}
