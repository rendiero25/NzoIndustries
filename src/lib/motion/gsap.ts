"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Satu titik registrasi GSAP untuk storefront (design-system.md §8).
 * Import dari sini, bukan langsung dari "gsap", agar plugin terdaftar sekali.
 * Dashboard admin/akun tidak memakai GSAP.
 */
let registered = false;

export function ensureGsap() {
  if (!registered && typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger, useGSAP);
    gsap.defaults({ ease: "expo.out", duration: 0.3 });
    registered = true;
  }
  return gsap;
}

export { gsap, ScrollTrigger, useGSAP };
