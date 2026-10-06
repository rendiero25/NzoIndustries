import { AuthSplitShell } from "@/components/auth/auth-split-shell";

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthSplitShell formMaxWidthClass="max-w-sm" note="Buat kata sandi baru, lalu masuk kembali.">
      {children}
    </AuthSplitShell>
  );
}
