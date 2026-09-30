/**
 * Membangun URL wa.me untuk CS (NEXT_PUBLIC_WHATSAPP_NUMBER).
 */
export function buildWhatsAppUrl(message: string): string | null {
  const digits = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
