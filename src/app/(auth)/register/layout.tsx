import { AuthSplitShell } from "@/components/auth/auth-split-shell";

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthSplitShell
      formMaxWidthClass="max-w-lg"
      note="Satu akun untuk Garasi, riwayat pesanan, dan cek kecocokan part."
    >
      {children}
    </AuthSplitShell>
  );
}
