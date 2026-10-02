import { AuthSplitShell } from "@/components/auth/auth-split-shell";

export default function VerifyEmailLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthSplitShell
      formMaxWidthClass="max-w-lg"
      leftPanel={
        <>
          <p className="max-w-lg text-[clamp(2rem,4vw,2.5rem)] leading-[1.1] font-semibold text-white uppercase">
            Hampir selesai!
            <br />
            Cek email kamu.
            <br />
            <span className="text-foreground normal-case">NZO Industries.</span>
          </p>
          <p className="mt-6 max-w-md text-[16px] font-normal text-white lg:max-w-xs">
            Satu langkah lagi untuk mulai berbelanja gadget & aksesoris pilihan terbaik.
          </p>
        </>
      }
    >
      {children}
    </AuthSplitShell>
  );
}
