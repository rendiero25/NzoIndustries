/** Input halaman auth: 44px+, radius-md, fokus border hitam + ring (design-system.md §4, §13). */
export const AUTH_INPUT_CLASS =
  "h-12 w-full rounded-md border border-input bg-background px-3.5 text-base text-foreground shadow-none placeholder:text-steel-500 focus-visible:border-foreground focus-visible:ring-2 focus-visible:ring-ring/15 aria-invalid:border-destructive";

/** Field password auth: ruang kanan untuk tombol tampil/sembunyikan. */
export const AUTH_PASSWORD_INPUT_CLASS = `${AUTH_INPUT_CLASS} pr-11`;
