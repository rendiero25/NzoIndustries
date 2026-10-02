/** Token motion design-system.md §8 (detik untuk GSAP, ms untuk CSS). */
export const DURATION = {
  instant: 0.1,
  fast: 0.2,
  base: 0.3,
  slow: 0.5,
} as const;

/** Masuk: cubic-bezier(0.22, 1, 0.36, 1). Keluar: cubic-bezier(0.4, 0, 1, 1). */
export const EASE = {
  out: "expo.out",
  in: "power2.in",
  cssOut: "cubic-bezier(0.22, 1, 0.36, 1)",
  cssIn: "cubic-bezier(0.4, 0, 1, 1)",
} as const;
