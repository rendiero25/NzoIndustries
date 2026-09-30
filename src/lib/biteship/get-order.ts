import "server-only";

export type BiteshipOrderDetail = {
  id: string;
  status: string;
  courier: {
    waybill_id: string | null;
    tracking_id: string | null;
    name: string | null;
    link: string | null;
  } | null;
};

export async function getBiteshipOrder(
  biteshipOrderId: string,
): Promise<{ ok: true; order: BiteshipOrderDetail } | { ok: false; error: string }> {
  const key = process.env.BITESHIP_API_KEY?.trim();
  if (!key) return { ok: false, error: "Biteship API key tidak dikonfigurasi." };

  try {
    const res = await fetch(
      `https://api.biteship.com/v1/orders/${encodeURIComponent(biteshipOrderId)}`,
      {
        headers: {
          Authorization: key.startsWith("Bearer ") ? key : `Bearer ${key}`,
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );

    const json = (await res.json()) as Record<string, unknown>;

    if (!res.ok || json.success === false) {
      const errMsg =
        (json.error as string) ?? (json.message as string) ?? `Biteship error ${res.status}`;
      return { ok: false, error: errMsg };
    }

    const courier = json.courier as Record<string, unknown> | undefined;

    return {
      ok: true,
      order: {
        id: json.id as string,
        status: (json.status as string) ?? "pending",
        courier: courier
          ? {
              waybill_id: (courier.waybill_id as string | null) ?? null,
              tracking_id: (courier.tracking_id as string | null) ?? null,
              name: (courier.name as string | null) ?? null,
              link: (courier.link as string | null) ?? null,
            }
          : null,
      },
    };
  } catch {
    return { ok: false, error: "Jaringan ke Biteship gagal." };
  }
}
