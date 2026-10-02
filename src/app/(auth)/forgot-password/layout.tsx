import { AuthSplitShell } from "@/components/auth/auth-split-shell";

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthSplitShell
      formMaxWidthClass="max-w-md"
      leftPanel={
        <>
          <p className="max-w-lg text-[clamp(2rem,4vw,2.5rem)] leading-[1.1] font-semibold text-white uppercase">
            Reset
            <br />
            kata sandi.
            <br />
            <span className="text-foreground normal-case">NZO Industries.</span>
          </p>
          <p className="mt-6 max-w-md text-[16px] leading-relaxed font-normal text-white lg:max-w-xs">
            Kami akan kirimkan link reset ke emailmu. Proses hanya butuh beberapa detik.
          </p>
        </>
      }
    >
      {children}
    </AuthSplitShell>
  );
}
