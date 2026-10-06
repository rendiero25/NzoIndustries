"use client";

import { useRef } from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { ensureGsap, useGSAP } from "@/lib/motion/gsap";
import { DURATION } from "@/lib/motion/tokens";

import {
  VehicleSelector,
  type SelectorActive,
  type SelectorMake,
  type SelectorModel,
} from "./vehicle-selector";

type Props = {
  makes: SelectorMake[];
  models: SelectorModel[];
  active: SelectorActive;
};

/**
 * Hero hitam beranda (design-system §5) dengan satu-satunya orkestrasi GSAP
 * (§8): headline → pemilih kendaraan → catatan. Reduced motion: tanpa animasi.
 */
export function HomeHero({ makes, models, active }: Props) {
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (reduced) return;
      const gsap = ensureGsap();
      gsap
        .timeline({ defaults: { ease: "expo.out", duration: DURATION.slow * 1.6 } })
        .from("[data-hero-line]", { yPercent: 60, opacity: 0, stagger: 0.08 })
        .from("[data-hero-selector]", { y: 24, opacity: 0 }, "-=0.45")
        .from("[data-hero-note]", { opacity: 0, duration: DURATION.slow }, "-=0.3");
    },
    { scope: root, dependencies: [reduced] },
  );

  return (
    <section
      ref={root}
      id="pilih-kendaraan"
      aria-labelledby="hero-title"
      className="relative overflow-hidden bg-brand-black text-white"
    >
      <div className="nzo-container relative py-14 md:py-20 lg:py-24">
        <div className="flex max-w-4xl flex-col gap-8 md:gap-10">
          <h1
            id="hero-title"
            className="text-[2.25rem] leading-[2.625rem] font-extrabold tracking-[-0.03em] text-white md:text-[3.5rem] md:leading-[3.75rem]"
          >
            <span data-hero-line className="block overflow-hidden">
              Part yang pas,
            </span>
            <span data-hero-line className="block overflow-hidden text-steel-200">
              untuk kendaraan yang kamu kendarai.
            </span>
          </h1>
          <div data-hero-selector className="flex flex-col gap-3">
            <p className="text-steel-200">Pilih kendaraanmu, kami tunjukkan part yang cocok.</p>
            <VehicleSelector
              makes={makes}
              models={models}
              active={active}
              variant="hero"
              redirectTo="/products?fit=1"
            />
          </div>
          <p data-hero-note className="text-sm text-steel-500">
            Atau cari langsung dengan nama part, kode part, atau SKU di kolom pencarian.
          </p>
        </div>
      </div>
    </section>
  );
}
