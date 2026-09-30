/**
 * Turnstile aktif kapan pun site key tersedia — termasuk saat `npm run dev`,
 * karena dev & production sama-sama connect ke project Supabase yang sama,
 * dan Supabase Auth Captcha Protection di-enforce di level project (bukan
 * per-environment). Kalau digate ke NODE_ENV === "production" doang, widget
 * tidak pernah render di dev sehingga token selalu kosong dan login/register
 * selalu ditolak 400 oleh Supabase.
 */
export function isTurnstileRequired(): boolean {
  return !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
}
