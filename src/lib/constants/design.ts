/**
 * NZO Industries Design System Constants
 *
 * Swiss Style: hitam + putih + aksen oranye.
 * Gunakan konstanta ini di logic JS/TS (GSAP, charts, conditional styling).
 * Untuk styling CSS/Tailwind, gunakan CSS variables atau utility class.
 */

// ============================================================
// Brand Colors
// ============================================================
export const BRAND_COLOR = {
  ORANGE: "#000000",
  ORANGE_HOVER: "#3A3D42",
  BLACK: "#000000",
  WHITE: "#FFFFFF",
} as const;

// ============================================================
// Breakpoints (sync dengan Tailwind)
// ============================================================
export const BREAKPOINT = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  "2XL": 1440,
} as const;

// ============================================================
// Spacing scale (base 4px)
// ============================================================
export const SPACING = {
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  8: "2rem",
  10: "2.5rem",
  12: "3rem",
  16: "4rem",
  20: "5rem",
  24: "6rem",
  32: "8rem",
} as const;

// ============================================================
// Animation (GSAP durations & eases)
// ============================================================
export const ANIMATION = {
  DURATION_FAST: 0.2,
  DURATION_BASE: 0.4,
  DURATION_SLOW: 0.7,
  EASE_OUT: "power2.out",
  EASE_IN_OUT: "power2.inOut",
  EASE_ELASTIC: "elastic.out(1, 0.5)",
} as const;

// ============================================================
// Z-index layers
// ============================================================
export const Z_INDEX = {
  BASE: 0,
  DROPDOWN: 10,
  STICKY: 20,
  FIXED: 30,
  MODAL_OVERLAY: 40,
  MODAL: 50,
  TOAST: 60,
} as const;

// ============================================================
// Typography scale (pixel values, untuk GSAP split text, dll)
// ============================================================
export const FONT_SIZE = {
  XS: "0.75rem",
  SM: "0.875rem",
  BASE: "1rem",
  LG: "1.125rem",
  XL: "1.25rem",
  "2XL": "1.5rem",
  "3XL": "1.875rem",
  "4XL": "2.25rem",
  "5XL": "3rem",
} as const;

// ============================================================
// Product & business logic
// ============================================================
export const MAX_CART_ITEMS = 10;
export const MAX_WISHLIST_ITEMS = 50;
export const FREE_SHIPPING_THRESHOLD = 300_000;
export const DEFAULT_PAGE_SIZE = 24;
export const MAX_IMAGES_PER_PRODUCT = 8;
export const MAX_VARIANTS_PER_PRODUCT = 50;
export const MAX_REVIEW_IMAGES = 3;
export const MIN_ORDER_WEIGHT_GRAM = 1;

// ============================================================
// Rating
// ============================================================
export const MAX_RATING = 5;
export const MIN_RATING = 1;

// ============================================================
// Regex patterns
// ============================================================
export const REGEX = {
  PHONE_ID: /^(\+62|62|0)8[1-9][0-9]{7,10}$/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  POSTAL_CODE_ID: /^\d{5}$/,
} as const;
