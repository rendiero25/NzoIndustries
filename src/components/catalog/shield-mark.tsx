import type { SVGProps } from "react";

/**
 * Motif perisai NZO (design-system.md §1 prinsip 3). Hanya dipakai untuk
 * kecocokan kendaraan. Bentuk sementara sampai logo resmi tersedia; tanda
 * centang di dalam = "cocok".
 */
export function ShieldMark({
  checked = true,
  ...props
}: SVGProps<SVGSVGElement> & { checked?: boolean }) {
  return (
    <svg viewBox="0 0 20 22" fill="none" aria-hidden="true" {...props}>
      <path
        d="M10 1.25 18 4.1v6.15c0 4.92-3.37 8.9-8 10.5-4.63-1.6-8-5.58-8-10.5V4.1L10 1.25Z"
        fill="currentColor"
      />
      {checked ? (
        <path
          d="m6.4 11 2.45 2.45L13.9 8.4"
          stroke="var(--shield-check, #fff)"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
    </svg>
  );
}
