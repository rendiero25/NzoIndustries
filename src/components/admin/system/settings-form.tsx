"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm, useWatch, type FieldPath } from "react-hook-form";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { storeSettingsSchema, type StoreSettingsValues } from "@/lib/validations/admin-system";
import { saveStoreSettings } from "@/server/actions/admin/system";
import type { StoreSettings } from "@/server/queries/admin/system";

export function SettingsForm({
  settings,
  canEdit,
  couriers,
}: {
  settings: StoreSettings;
  canEdit: boolean;
  couriers: string[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<StoreSettingsValues>({
    resolver: zodResolver(storeSettingsSchema),
    defaultValues: {
      storeName: settings.storeName,
      supportEmail: settings.supportEmail ?? "",
      supportWhatsapp: settings.supportWhatsapp ?? "",
      mayarEnabled: settings.mayarEnabled,
      paymentTimeoutMinutes: settings.paymentTimeoutMinutes,
      lowStockThreshold: settings.lowStockThreshold,
      returnWindowDays: settings.returnWindowDays,
      requireStaffMfa: settings.requireStaffMfa,
      shipper: {
        name: settings.shipper.name ?? "",
        phone: settings.shipper.phone ?? "",
        address: settings.shipper.address ?? "",
        postalCode: settings.shipper.postalCode ?? "",
        areaId: settings.shipper.areaId ?? "",
      },
    },
  });

  const mayar = useWatch({ control, name: "mayarEnabled" });
  const mfa = useWatch({ control, name: "requireStaffMfa" });

  const onSubmit = (values: StoreSettingsValues) =>
    start(async () => {
      const res = await saveStoreSettings(values);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Pengaturan disimpan.");
      reset(values);
      router.refresh();
    });

  const field = (
    name: FieldPath<StoreSettingsValues>,
    label: string,
    props: React.ComponentProps<typeof Input> = {},
  ) => {
    const err = name
      .split(".")
      .reduce<unknown>((acc, k) => (acc as Record<string, unknown> | undefined)?.[k], errors) as
      { message?: string } | undefined;
    return (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`s-${name}`}>{label}</Label>
        <Input
          id={`s-${name}`}
          aria-invalid={!!err}
          disabled={!canEdit}
          {...props}
          {...register(name)}
        />
        {err?.message ? <p className="text-sm text-danger">{err.message}</p> : null}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {!canEdit ? (
        <Alert>
          <AlertTitle>Hanya owner yang bisa mengubah pengaturan</AlertTitle>
          <AlertDescription>Kamu bisa melihat nilai yang berlaku sekarang.</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Info toko</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {field("storeName", "Nama toko")}
          {field("supportEmail", "Email layanan pelanggan", { type: "email" })}
          {field("supportWhatsapp", "WhatsApp layanan pelanggan", { placeholder: "08…" })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pembayaran & pesanan</CardTitle>
          <CardDescription>
            Pembayaran hanya lewat Mayar (QRIS, VA, e-wallet, kartu).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-4 sm:col-span-2">
            <div className="flex flex-col">
              <Label htmlFor="s-mayar">Mayar aktif</Label>
              <span className="text-caption text-muted-foreground">
                Mati = checkout tidak bisa dibayar.
              </span>
            </div>
            <Switch
              id="s-mayar"
              checked={mayar}
              disabled={!canEdit}
              onCheckedChange={(v) => setValue("mayarEnabled", v, { shouldDirty: true })}
            />
          </div>
          {field("paymentTimeoutMinutes", "Batas waktu bayar (menit)", { inputMode: "numeric" })}
          {field("returnWindowDays", "Jendela retur (hari setelah diterima)", {
            inputMode: "numeric",
          })}
          {field("lowStockThreshold", "Ambang stok menipis", { inputMode: "numeric" })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pengirim & kurir</CardTitle>
          <CardDescription>
            Data pengirim untuk resi dan pengiriman Biteship. Diisi setelah klien mengirim data
            gudang.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {field("shipper.name", "Nama pengirim")}
          {field("shipper.phone", "Telepon pengirim", { placeholder: "08…" })}
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="s-shipper-address">Alamat gudang</Label>
            <Textarea
              id="s-shipper-address"
              rows={3}
              disabled={!canEdit}
              {...register("shipper.address")}
            />
            {errors.shipper?.address ? (
              <p className="text-sm text-danger">{errors.shipper.address.message}</p>
            ) : null}
          </div>
          {field("shipper.postalCode", "Kode pos gudang", { inputMode: "numeric" })}
          {field("shipper.areaId", "Biteship area ID (opsional)")}
          <div className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium">Kurir aktif</span>
            <span className="text-muted-foreground">
              {couriers.length ? couriers.join(", ").toUpperCase() : "Belum diatur"} — diatur lewat
              env{" "}
              <code className="rounded bg-muted px-1 font-mono text-caption">
                BITESHIP_COURIERS
              </code>
              .
            </span>
          </div>
          <div className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium">Pajak</span>
            <span className="text-muted-foreground">
              Menunggu status PKP dari klien. Harga saat ini belum memisahkan PPN.
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Keamanan staf</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <Label htmlFor="s-mfa">Wajibkan MFA (kode authenticator) untuk staf</Label>
              <span className="text-caption text-muted-foreground">
                Staf tanpa MFA tidak bisa membuka data admin sampai mendaftarkan authenticator di
                /admin/mfa.
              </span>
            </div>
            <Switch
              id="s-mfa"
              checked={mfa}
              disabled={!canEdit}
              onCheckedChange={(v) => setValue("requireStaffMfa", v, { shouldDirty: true })}
            />
          </div>
          {!mfa ? (
            <Alert>
              <ShieldAlert />
              <AlertTitle>MFA staf sedang mati</AlertTitle>
              <AlertDescription>Disarankan menyalakan MFA sebelum toko dibuka.</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      {canEdit ? (
        <div className="sticky bottom-0 z-10 flex justify-end border-t border-border bg-background/95 py-3 backdrop-blur">
          <Button type="submit" disabled={pending || !isDirty}>
            {pending ? "Menyimpan…" : "Simpan pengaturan"}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
