"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

import { updateProfileAction } from "@/app/(dashboard)/dashboard/profile/_actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/store/auth-store";

const BANK_OPTIONS = [
  "BCA",
  "BNI",
  "BRI",
  "Mandiri",
  "BSI",
  "CIMB Niaga",
  "SeaBank",
  "Danamon",
  "Permata",
  "BTN",
  "Maybank",
  "OCBC",
  "Lainnya",
];

async function refreshProfileInAuthStore() {
  try {
    const res = await fetch("/api/profile/me");
    if (!res.ok) return;
    const { profile } = await res.json();
    if (profile) useAuthStore.getState().setProfile(profile);
  } catch {
    /* ignore */
  }
}

type Profile = {
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
};

export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [bankName, setBankName] = useState(profile.bank_name ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = profile.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/avatar", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) {
        setAvatarUrl(data.url);
        const current = useAuthStore.getState().profile;
        if (current) useAuthStore.getState().setProfile({ ...current, avatar_url: data.url });
        await refreshProfileInAuthStore();
        toast.success("Foto berhasil diunggah.");
      } else {
        toast.error(data.error ?? "Gagal mengunggah foto.");
      }
    } catch {
      toast.error("Gagal mengunggah foto.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <form
      className="w-full space-y-5 rounded-xl border border-[#e0e0e0] bg-white p-6"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const res = await updateProfileAction({
            full_name: String(fd.get("full_name") ?? ""),
            phone: String(fd.get("phone") ?? ""),
            avatar_url: avatarUrl,
            bank_name: bankName || undefined,
            bank_account_name: String(fd.get("bank_account_name") ?? "") || undefined,
            bank_account_number: String(fd.get("bank_account_number") ?? "") || undefined,
          });
          if (res.success) {
            toast.success("Profil diperbarui.");
            await refreshProfileInAuthStore();
            router.refresh();
          } else {
            toast.error(res.error);
          }
        });
      }}
    >
      {/* Avatar */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="group relative h-24 w-24 overflow-hidden rounded-full border-2 border-[#e0e0e0] bg-[#f5f5f7] transition hover:border-[#EA5329] disabled:cursor-not-allowed"
          aria-label="Ganti foto profil"
        >
          {avatarUrl ? (
            <Image src={avatarUrl} alt="Foto profil" fill className="object-cover" sizes="96px" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-[#1d1d1f]">
              {initials}
            </span>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
            {uploading ? (
              <Spinner className="size-5 text-white" />
            ) : (
              <Camera size={20} className="text-white" />
            )}
          </div>
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Spinner className="size-5 text-white" />
            </div>
          )}
        </button>
        <Button
          type="button"
          variant="link"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Mengunggah..." : "Ganti Foto"}
        </Button>
        <p className="text-[11px] text-[#7a7a7a]">JPG, PNG, WebP, atau GIF · Maks. 2MB</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <div>
        <Label htmlFor="full_name">Nama lengkap</Label>
        <Input
          id="full_name"
          name="full_name"
          defaultValue={profile.full_name ?? ""}
          className="mt-1 border-[#e0e0e0]"
        />
      </div>
      <div>
        <Label htmlFor="phone">Nomor telepon</Label>
        <Input
          id="phone"
          name="phone"
          defaultValue={profile.phone ?? ""}
          className="mt-1 border-[#e0e0e0]"
        />
      </div>

      {/* Bank account section */}
      <div className="space-y-4 border-t border-[#f0f0f0] pt-5">
        <div>
          <p className="text-sm font-semibold text-[#1d1d1f]">Rekening bank</p>
          <p className="mt-0.5 text-[12px] text-[#7a7a7a]">
            Digunakan untuk pengembalian dana jika pesanan dibatalkan setelah pembayaran.
          </p>
        </div>
        <div>
          <Label htmlFor="profile-bank-name">Nama bank</Label>
          <Select value={bankName} onValueChange={setBankName}>
            <SelectTrigger id="profile-bank-name" className="mt-1 border-[#e0e0e0]">
              <SelectValue placeholder="Pilih bank..." />
            </SelectTrigger>
            <SelectContent>
              {BANK_OPTIONS.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="bank_account_name">Nama pemilik rekening</Label>
          <Input
            id="bank_account_name"
            name="bank_account_name"
            defaultValue={profile.bank_account_name ?? ""}
            placeholder="Sesuai buku tabungan / ATM"
            className="mt-1 border-[#e0e0e0]"
          />
        </div>
        <div>
          <Label htmlFor="bank_account_number">Nomor rekening</Label>
          <Input
            id="bank_account_number"
            name="bank_account_number"
            defaultValue={profile.bank_account_number ?? ""}
            placeholder="Contoh: 1234567890"
            inputMode="numeric"
            className="mt-1 border-[#e0e0e0] font-mono"
          />
        </div>
      </div>

      <Button type="submit" variant="primary" loading={pending || uploading}>
        Simpan
      </Button>
    </form>
  );
}
