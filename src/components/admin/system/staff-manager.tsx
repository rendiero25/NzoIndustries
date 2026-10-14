"use client";

import { Search, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { nativeSelectClass } from "@/components/admin/form-styles";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { findUserByEmail, setStaffRole } from "@/server/actions/admin/system";
import type { StaffMember } from "@/server/queries/admin/system";

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  warehouse: "Gudang",
  cs: "Customer service",
  customer: "Pelanggan (cabut akses)",
};

const ROLE_HINT: Record<string, string> = {
  owner: "Semua akses, termasuk staf, pengaturan, dan MFA.",
  admin: "Katalog, promo, konten, pesanan, laporan.",
  warehouse: "Pesanan dan stok.",
  cs: "Pesanan, pelanggan, ulasan, retur.",
};

const date = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  dateStyle: "medium",
  timeStyle: "short",
});

type Pending = { userId: string; name: string; role: string } | null;

export function StaffManager({
  staff,
  currentUserId,
  isOwner,
}: {
  staff: StaffMember[];
  currentUserId: string;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState<Pending>(null);
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState("");
  const [found, setFound] = useState<{
    id: string;
    fullName: string | null;
    email: string;
    role: string;
  } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [newRole, setNewRole] = useState("cs");

  const apply = () => {
    if (!confirm) return;
    start(async () => {
      const res = await setStaffRole({ userId: confirm.userId, role: confirm.role });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Role ${confirm.name} jadi ${ROLE_LABEL[confirm.role]}.`);
      setConfirm(null);
      setAdding(false);
      setFound(null);
      setEmail("");
      router.refresh();
    });
  };

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await findUserByEmail(email);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setFound(res.user);
      setNotFound(!res.user);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {isOwner
            ? "Hanya owner yang bisa mengubah role."
            : "Hanya owner yang bisa mengubah role. Kamu bisa melihat daftar saja."}
        </p>
        {isOwner ? (
          <Button onClick={() => setAdding(true)}>
            <UserPlus /> Tambah staf
          </Button>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staf</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Masuk terakhir</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map((s) => {
              const self = s.id === currentUserId;
              const name = s.fullName || s.email;
              return (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="flex items-center gap-2 font-medium">
                        {s.fullName || "(tanpa nama)"}
                        {self ? <Badge variant="secondary">Kamu</Badge> : null}
                        {s.isBlocked ? <Badge variant="destructive">Diblokir</Badge> : null}
                      </span>
                      <span className="text-caption text-muted-foreground">{s.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {isOwner && !self ? (
                      <select
                        aria-label={`Role ${name}`}
                        className={`${nativeSelectClass} w-52`}
                        value={s.role}
                        disabled={pending}
                        onChange={(e) => setConfirm({ userId: s.id, name, role: e.target.value })}
                      >
                        {Object.entries(ROLE_LABEL).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm">{ROLE_LABEL[s.role] ?? s.role}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                    {s.lastSignInAt ? date.format(new Date(s.lastSignInAt)) : "Belum pernah"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
        {Object.entries(ROLE_HINT).map(([role, hint]) => (
          <li key={role}>
            <span className="font-medium text-foreground">{ROLE_LABEL[role]}:</span> {hint}
          </li>
        ))}
      </ul>

      <Dialog
        open={adding}
        onOpenChange={(o) => {
          setAdding(o);
          if (!o) {
            setFound(null);
            setNotFound(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah staf</DialogTitle>
            <DialogDescription>
              Calon staf daftar akun dulu di toko, lalu cari dengan email persis.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={search} className="flex gap-2">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@contoh.com"
              aria-label="Email akun"
            />
            <Button type="submit" variant="secondary" disabled={pending || email.trim().length < 5}>
              <Search /> Cari
            </Button>
          </form>
          {notFound ? (
            <p className="text-sm text-muted-foreground">Akun dengan email itu tidak ditemukan.</p>
          ) : null}
          {found ? (
            <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
              <div className="flex flex-col">
                <span className="font-medium">{found.fullName || "(tanpa nama)"}</span>
                <span className="text-caption text-muted-foreground">
                  {found.email} · sekarang {ROLE_LABEL[found.role] ?? found.role}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-role">Jadikan</Label>
                <select
                  id="new-role"
                  className={nativeSelectClass}
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                >
                  {["admin", "warehouse", "cs", "owner"].map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(false)} disabled={pending}>
              Batal
            </Button>
            <Button
              disabled={!found || pending || found.id === currentUserId}
              onClick={() =>
                found &&
                setConfirm({ userId: found.id, name: found.fullName || found.email, role: newRole })
              }
            >
              Simpan role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`Ubah role ${confirm?.name ?? ""}?`}
        description={
          confirm?.role === "customer"
            ? "Akses panel admin dicabut. Akun tetap bisa berbelanja."
            : `Role baru: ${ROLE_LABEL[confirm?.role ?? ""] ?? ""}. ${ROLE_HINT[confirm?.role ?? ""] ?? ""}`
        }
        confirmLabel="Ubah role"
        variant={
          confirm?.role === "customer" || confirm?.role === "owner" ? "destructive" : "default"
        }
        isLoading={pending}
        onConfirm={apply}
      />
    </div>
  );
}
