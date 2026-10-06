"use client";

import { ensureGsap } from "./gsap";
import { DURATION } from "./tokens";

/**
 * Micro-interaction "tambah ke keranjang" (design-system §8): salinan gambar
 * produk terbang ke ikon keranjang di header. Hanya transform/opacity; dilewati
 * bila prefers-reduced-motion atau target tidak terlihat.
 */
export function flyToCart(source: HTMLElement | null) {
  if (!source || typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const target = [...document.querySelectorAll<HTMLElement>("[data-cart-target]")].find(
    (el) => el.offsetParent !== null,
  );
  if (!target) return;

  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  if (!from.width || !to.width) return;

  const ghost = source.cloneNode(true) as HTMLElement;
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    margin: "0",
    zIndex: "60",
    pointerEvents: "none",
    borderRadius: "12px",
    overflow: "hidden",
    willChange: "transform, opacity",
  });
  ghost.setAttribute("aria-hidden", "true");
  document.body.appendChild(ghost);

  const scale = Math.max(0.08, Math.min(to.width / from.width, 0.2));
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);

  const gsap = ensureGsap();
  gsap
    .timeline({ onComplete: () => ghost.remove() })
    .to(ghost, { x: dx, y: dy, scale, duration: DURATION.slow * 1.4, ease: "power2.inOut" })
    .to(ghost, { opacity: 0, duration: DURATION.fast }, "-=0.15");
}
