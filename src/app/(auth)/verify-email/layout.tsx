import { AuthSplitShell } from "@/components/auth/auth-split-shell";

export default function VerifyEmailLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthSplitShell
      formMaxWidthClass="max-w-md"
      note="Satu langkah lagi: aktifkan akun lewat link di email."
    >
      {children}
    </AuthSplitShell>
  );
}
