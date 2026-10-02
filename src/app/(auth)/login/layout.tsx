import { AuthSplitShell } from "@/components/auth/auth-split-shell";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthSplitShell
      imagePriority
      formMaxWidthClass="w-full lg:w-1/2"
      leftPanel={
        <>
          <p className="max-w-lg text-[clamp(2rem,4vw,2.5rem)] leading-[1.1] font-semibold text-white uppercase">
            Gear up.
            <br />
            Level up.
            <br />
            <span className="text-foreground normal-case">NZO Industries.</span>
          </p>
          <p className="mt-6 max-w-md text-[16px] leading-relaxed font-normal text-white lg:max-w-xs">
            Smartwatch, earphone, aksesoris gadget. Produk original bergaransi resmi. Pengiriman ke
            seluruh Indonesia.
          </p>
        </>
      }
    >
      {children}
    </AuthSplitShell>
  );
}
