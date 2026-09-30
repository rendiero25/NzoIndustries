import "server-only";

type ConfirmBiteshipOrderResult =
  { ok: true; status: string; waybillId: string | null } | { ok: false; error: string };

export async function confirmBiteshipOrder(
  biteshipOrderId: string,
): Promise<ConfirmBiteshipOrderResult> {
  const key = process.env.BITESHIP_API_KEY?.trim();
  if (!key) return { ok: false, error: "BITESHIP_API_KEY tidak dikonfigurasi." };

  try {
    const res = await fetch(`https://api.biteship.com/v1/orders/${biteshipOrderId}/confirm`, {
      method: "POST",
      headers: {
        Authorization: key.startsWith("Bearer ") ? key : `Bearer ${key}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    const json = (await res.json()) as Record<string, unknown>;

    if (!res.ok || json.success === false) {
      const errMsg =
        (json.error as string) ?? (json.message as string) ?? `Biteship error ${res.status}`;
      console.error("[Biteship confirmOrder] failed", {
        biteshipOrderId,
        status: res.status,
        errMsg,
      });
      return { ok: false, error: errMsg };
    }

    // Biteship menerbitkan waybill saat order dikonfirmasi, sebelum kurir dialokasikan.
    const courier = json.courier as Record<string, unknown> | undefined;
    const waybillId = (courier?.waybill_id as string | null | undefined) ?? null;

    return { ok: true, status: (json.status as string) ?? "confirmed", waybillId };
  } catch (err) {
    console.error("[Biteship confirmOrder] network error", { biteshipOrderId, err });
    return { ok: false, error: "Jaringan ke Biteship gagal." };
  }
}
