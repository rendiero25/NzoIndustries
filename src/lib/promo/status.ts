/** Status tampilan periode promo (dipakai server & client). */
export function saleState(s: { isActive: boolean; startsAt: string; endsAt: string }, now: number) {
  if (!s.isActive) return { label: "Nonaktif", variant: "outline" as const };
  if (new Date(s.endsAt).getTime() <= now) return { label: "Selesai", variant: "outline" as const };
  if (new Date(s.startsAt).getTime() > now)
    return { label: "Terjadwal", variant: "outline" as const };
  return { label: "Berjalan", variant: "secondary" as const };
}
