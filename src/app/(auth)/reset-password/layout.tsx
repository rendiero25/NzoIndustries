import { AuthSplitShell } from "@/components/auth/auth-split-shell";

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthSplitShell
      formMaxWidthClass="max-w-md"
      leftPanel={
        <>
          <p className="max-w-lg text-[clamp(2rem,4vw,2.5rem)] leading-[1.1] font-semibold text-white uppercase">
            Buat kata
            <br />
            sandi baru.
            <br />
            <span className="text-[#EA5329] normal-case">NZO Industries.</span>
          </p>
          <p className="mt-6 max-w-md text-[16px] leading-relaxed font-normal text-white lg:max-w-xs">
            Pilih kata sandi yang kuat untuk melindungi akunmu.
          </p>
        </>
      }
    >
      {children}
    </AuthSplitShell>
  );
}
