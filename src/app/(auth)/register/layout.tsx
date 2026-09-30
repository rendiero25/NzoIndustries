import { AuthSplitShell } from "@/components/auth/auth-split-shell";

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthSplitShell
      formMaxWidthClass="max-w-lg"
      leftPanel={
        <>
          <p className="max-w-lg text-[clamp(2rem,4vw,2.5rem)] leading-[1.1] font-semibold text-white uppercase">
            Mulai koleksi
            <br />
            gadget terbaikmu.
            <br />
            <span className="text-[#EA5329] normal-case">NZO Industries.</span>
          </p>
          <p className="mt-6 max-w-md text-[16px] font-normal text-white lg:max-w-xs">
            Wearable & aksesoris pilihan kurator. Daftar sekali, belanja dengan tenang — garansi
            resmi & dukungan tim kami.
          </p>
        </>
      }
    >
      {children}
    </AuthSplitShell>
  );
}
