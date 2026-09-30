import "server-only";

export type TrackingStep = {
  status: string;
  /** Human-readable description (description → note → status fallback) */
  description: string;
  /** Raw note from Biteship — often contains location/hub detail */
  note: string;
  at: string | null;
};

export type TrackingResult =
  | { ok: true; waybillId: string; status: string; steps: TrackingStep[]; link: string | null }
  | { ok: false; error: string };

/** Biteship history entry — may contain a nested `history` array (recursive format) */
type BiteshipHistory = {
  status?: string;
  description?: string;
  note?: string;
  updated_at?: string;
  /** Nested history array — present in multi-leg / aggregated tracking responses */
  history?: BiteshipHistory[];
  service_type?: string;
  waybill_id?: string;
};

type BiteshipTrackingResponse = {
  success?: boolean;
  waybill_id?: string;
  status?: string;
  history?: BiteshipHistory[];
  link?: string;
};

/**
 * Recursively flattens nested Biteship history arrays.
 * Some couriers (e.g. multi-leg shipments) return history as:
 *   [ { history: [ { status, note, updated_at }, … ] } ]
 * Others return a flat array of step objects directly.
 * This function handles both and produces a single flat list.
 */
function flattenHistory(items: BiteshipHistory[]): BiteshipHistory[] {
  const out: BiteshipHistory[] = [];
  for (const item of items) {
    if (Array.isArray(item.history) && item.history.length > 0) {
      out.push(...flattenHistory(item.history));
    } else if (item.status) {
      out.push(item);
    }
  }
  return out;
}

export async function fetchBiteshipTracking(
  waybillId: string,
  courierCode: string,
): Promise<TrackingResult> {
  const key = process.env.BITESHIP_API_KEY?.trim();
  if (!key) return { ok: false, error: "Biteship tidak dikonfigurasi." };

  try {
    const res = await fetch(
      `https://api.biteship.com/v1/trackings/${encodeURIComponent(waybillId)}?couriers=${encodeURIComponent(courierCode.toLowerCase())}`,
      {
        headers: {
          Authorization: key.startsWith("Bearer ") ? key : `Bearer ${key}`,
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );

    const json = (await res.json()) as BiteshipTrackingResponse;
    if (!res.ok || !json.success) {
      return { ok: false, error: "Data tracking belum tersedia." };
    }

    // Flatten nested / recursive history, then sort chronologically (oldest → newest)
    const raw = flattenHistory(json.history ?? []);
    raw.sort((a, b) => {
      const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return tb - ta; // keep Biteship's default newest-first; caller reverses for display
    });

    const steps: TrackingStep[] = raw.map((h) => ({
      status: h.status ?? "",
      description: h.description || h.note || h.status || "",
      note: h.note ?? "",
      at: h.updated_at ?? null,
    }));

    return {
      ok: true,
      waybillId: json.waybill_id ?? waybillId,
      status: json.status ?? "",
      steps,
      link: json.link ?? null,
    };
  } catch {
    return { ok: false, error: "Jaringan ke Biteship gagal." };
  }
}

/** Entri yang disimpan webhook Biteship ke shipments.tracking_history (oldest → newest). */
export type DbTrackingEntry = { status?: string; note?: string; at?: string | null };

/**
 * Konversi shipments.tracking_history (DB, urutan oldest → newest) menjadi
 * TrackingStep[] dalam urutan newest-first — sama seperti output Biteship live —
 * supaya komponen timeline (yang me-reverse) tetap konsisten apa pun sumbernya.
 */
export function trackingStepsFromHistory(history: unknown): TrackingStep[] {
  if (!Array.isArray(history)) return [];
  const steps = history
    .map((h): TrackingStep => {
      const e = (h ?? {}) as DbTrackingEntry;
      const status = (e.status ?? "").toLowerCase();
      return {
        status,
        description: e.note || status,
        note: e.note ?? "",
        at: e.at ?? null,
      };
    })
    .filter((s) => s.status);
  return steps.reverse();
}
