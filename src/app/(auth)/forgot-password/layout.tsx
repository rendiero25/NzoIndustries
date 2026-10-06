import { AuthSplitShell } from "@/components/auth/auth-split-shell";

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthSplitShell
      formMaxWidthClass="max-w-sm"
      note="Link untuk membuat kata sandi baru dikirim ke email kamu."
    >
      {children}
    </AuthSplitShell>
  );
}
