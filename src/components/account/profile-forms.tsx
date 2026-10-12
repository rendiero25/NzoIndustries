"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LogOut, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { PasswordVisibilityToggle } from "@/components/ui/password-visibility-toggle";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  changePasswordSchema,
  profileSchema,
  type ChangePasswordInput,
  type ProfileInput,
} from "@/lib/validations/account";
import {
  changePassword,
  deleteAccount,
  signOutEverywhere,
  updateProfile,
} from "@/server/actions/account/profile";

function FieldError({ message }: { message?: string }) {
  return message ? (
    <p role="alert" className="text-caption text-destructive">
      {message}
    </p>
  ) : null;
}

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-base">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function ProfileForm({
  email,
  fullName,
  phone,
}: {
  email: string | null;
  fullName: string | null;
  phone: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: fullName ?? "", phone: phone ?? "" },
  });
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = form;

  return (
    <Card title="Data diri">
      <form
        noValidate
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={handleSubmit((values) =>
          start(async () => {
            const res = await updateProfile(values);
            if (!res.ok) {
              for (const [k, v] of Object.entries(res.fieldErrors ?? {})) {
                if (v?.[0]) setError(k as keyof ProfileInput, { message: v[0] });
              }
              toast.error(res.error);
              return;
            }
            toast.success("Profil disimpan");
            form.reset(values);
            router.refresh();
          }),
        )}
      >
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="profile-email">Email</Label>
          <Input id="profile-email" value={email ?? ""} disabled readOnly />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="profile-name">Nama lengkap</Label>
          <Input
            id="profile-name"
            autoComplete="name"
            aria-invalid={!!errors.fullName}
            {...register("fullName")}
          />
          <FieldError message={errors.fullName?.message} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="profile-phone">Nomor HP</Label>
          <Input
            id="profile-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="08xxxxxxxxxx"
            aria-invalid={!!errors.phone}
            {...register("phone")}
          />
          <FieldError message={errors.phone?.message} />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={pending || !isDirty}>
            {pending ? <Spinner className="size-4" /> : null}
            Simpan perubahan
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function PasswordForm() {
  const [pending, start] = useTransition();
  const [show, setShow] = useState(false);
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = form;
  const type = show ? "text" : "password";

  return (
    <Card title="Kata sandi" description="Minimal 8 karakter, gabungan huruf dan angka.">
      <form
        noValidate
        className="grid gap-4 sm:max-w-md"
        onSubmit={handleSubmit((values) =>
          start(async () => {
            const res = await changePassword(values);
            if (!res.ok) {
              for (const [k, v] of Object.entries(res.fieldErrors ?? {})) {
                if (v?.[0]) setError(k as keyof ChangePasswordInput, { message: v[0] });
              }
              toast.error(res.error);
              return;
            }
            toast.success("Kata sandi diganti");
            reset();
          }),
        )}
      >
        <div className="grid gap-2">
          <Label htmlFor="pw-current">Kata sandi saat ini</Label>
          <div className="relative">
            <Input
              id="pw-current"
              className="h-11 pr-12"
              type={type}
              autoComplete="current-password"
              aria-invalid={!!errors.currentPassword}
              {...register("currentPassword")}
            />
            <PasswordVisibilityToggle visible={show} onToggle={() => setShow((v) => !v)} />
          </div>
          <FieldError message={errors.currentPassword?.message} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pw-new">Kata sandi baru</Label>
          <Input
            id="pw-new"
            className="h-11"
            type={type}
            autoComplete="new-password"
            aria-invalid={!!errors.newPassword}
            {...register("newPassword")}
          />
          <FieldError message={errors.newPassword?.message} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pw-confirm">Ulangi kata sandi baru</Label>
          <Input
            id="pw-confirm"
            className="h-11"
            type={type}
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
            {...register("confirmPassword")}
          />
          <FieldError message={errors.confirmPassword?.message} />
        </div>
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner className="size-4" /> : null}
            Ganti kata sandi
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function SessionsCard() {
  const [pending, start] = useTransition();
  return (
    <Card
      title="Sesi masuk"
      description="Keluar dari semua perangkat, termasuk perangkat ini. Kamu perlu masuk lagi."
    >
      <div>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await signOutEverywhere();
              if (!res.ok) {
                toast.error(res.error);
                return;
              }
              window.location.assign("/login");
            })
          }
        >
          {pending ? <Spinner className="size-4" /> : <LogOut className="size-4" />}
          Keluar dari semua perangkat
        </Button>
      </div>
    </Card>
  );
}

/** Zona bahaya: hapus akun (D-35) dengan ketik ulang email. */
export function DeleteAccountCard({ email }: { email: string | null }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [pending, start] = useTransition();
  const match = !!email && confirm.trim().toLowerCase() === email.toLowerCase();

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-danger/40 p-5">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-base text-danger">
          <TriangleAlert className="size-4" /> Hapus akun
        </h2>
        <p className="text-sm text-muted-foreground">
          Nama, nomor HP, alamat, garasi, wishlist, dan keranjang dihapus permanen dan kamu tidak
          bisa masuk lagi. Riwayat pesanan tetap kami simpan untuk keperluan pembukuan.
        </p>
      </div>
      <AlertDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setConfirm("");
        }}
      >
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="self-start">
            Hapus akun saya
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus akun secara permanen?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak bisa dibatalkan. Ketik{" "}
              <span className="font-semibold text-foreground">{email}</span> untuk melanjutkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="delete-confirm" className="sr-only">
              Ketik email
            </Label>
            <Input
              id="delete-confirm"
              autoComplete="off"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={email ?? ""}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel variant="secondary" disabled={pending}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={!match || pending}
              onClick={(e) => {
                e.preventDefault();
                start(async () => {
                  const res = await deleteAccount({ confirmEmail: confirm });
                  if (!res.ok) {
                    toast.error(res.error);
                    return;
                  }
                  toast.success("Akun dihapus");
                  window.location.assign("/");
                });
              }}
            >
              {pending ? <Spinner className="size-4" /> : null}
              Hapus permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
