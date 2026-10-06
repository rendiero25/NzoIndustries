import { AuthSplitShell } from "@/components/auth/auth-split-shell";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthSplitShell
      formMaxWidthClass="max-w-sm"
      note="Masuk untuk melihat pesanan, Garasi, dan wishlist kamu."
    >
      {children}
    </AuthSplitShell>
  );
}
