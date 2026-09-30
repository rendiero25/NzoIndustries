import "server-only";

export type CancelBiteshipOrderResult = { ok: true } | { ok: false; error: string };

export async function cancelBiteshipOrder(
  biteshipOrderId: string,
): Promise<CancelBiteshipOrderResult> {
  const key = process.env.BITESHIP_API_KEY?.trim();
  if (!key) return { ok: false, error: "BITESHIP_API_KEY tidak dikonfigurasi." };

  try {
    const res = await fetch(
      `https://api.biteship.com/v1/orders/${encodeURIComponent(biteshipOrderId)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: key.startsWith("Bearer ") ? key : `Bearer ${key}`,
          Accept: "application/json",
        },
      },
    );

    const json = (await res.json()) as Record<string, unknown>;

    if (!res.ok || json.success === false) {
      const errMsg =
        (json.error as string) ?? (json.message as string) ?? `Biteship cancel error ${res.status}`;
      console.error("[Biteship cancelOrder] failed", {
        biteshipOrderId,
        status: res.status,
        errMsg,
      });
      return { ok: false, error: errMsg };
    }

    return { ok: true };
  } catch (err) {
    console.error("[Biteship cancelOrder] network error", { biteshipOrderId, err });
    return { ok: false, error: "Jaringan ke Biteship gagal." };
  }
}
