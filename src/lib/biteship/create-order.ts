import "server-only";

import { ON_DEMAND_COURIERS } from "@/lib/shipping/on-demand-coords";

type BiteshipOrderItem = {
  name: string;
  value: number;
  quantity: number;
  weight: number;
};

export type CreateBiteshipOrderParams = {
  destinationName: string;
  destinationPhone: string;
  destinationAddress: string;
  destinationPostalCode: number;
  courierCompany: string;
  courierType: string;
  items: BiteshipOrderItem[];
  orderNote?: string;
  originLat?: number;
  originLng?: number;
  destLat?: number;
  destLng?: number;
};

export type CreateBiteshipOrderResult =
  | {
      ok: true;
      biteshipOrderId: string;
      awb: string | null;
      trackingId: string | null;
      status: string;
      courierName: string | null;
    }
  | { ok: false; error: string };

export async function createBiteshipOrder(
  params: CreateBiteshipOrderParams,
): Promise<CreateBiteshipOrderResult> {
  const key = process.env.BITESHIP_API_KEY?.trim();
  const shipperName = process.env.BITESHIP_SHIPPER_NAME?.trim();
  const shipperPhone = process.env.BITESHIP_SHIPPER_PHONE?.trim();
  const originAddress = process.env.BITESHIP_ORIGIN_ADDRESS?.trim();
  const originPostalRaw = (
    process.env.BITESHIP_ORIGIN_POSTAL_CODE ?? process.env.BITESHIP_ORIGIN_POSTAL
  )?.trim();

  if (!key || !shipperName || !shipperPhone || !originAddress || !originPostalRaw) {
    return { ok: false, error: "Biteship origin belum dikonfigurasi." };
  }

  const originPostal = parseInt(originPostalRaw, 10);
  if (!Number.isFinite(originPostal)) {
    return { ok: false, error: "BITESHIP_ORIGIN_POSTAL tidak valid." };
  }

  const base = "https://api.biteship.com";

  // Biteship requires `delivery_type: "now"` for all on-demand couriers
  // (Gojek Instant/Sameday, GrabExpress Instant/SameDay/InstantCar, Borzo, Lalamove, etc.)
  // Detect by courier_company — service-code string matching ("instant") misses
  // sameday/same_day variants.
  const isOnDemand = ON_DEMAND_COURIERS.has(params.courierCompany.toLowerCase());

  const body: Record<string, unknown> = {
    shipper_contact_name: shipperName,
    shipper_contact_phone: shipperPhone,
    shipper_organization: "NZO Industries",
    origin_contact_name: shipperName,
    origin_contact_phone: shipperPhone,
    origin_address: originAddress,
    origin_postal_code: originPostal,
    destination_contact_name: params.destinationName,
    destination_contact_phone: params.destinationPhone,
    destination_address: params.destinationAddress,
    destination_postal_code: params.destinationPostalCode,
    courier_company: params.courierCompany.toLowerCase(),
    courier_type: params.courierType.toLowerCase(),
    delivery_type: isOnDemand ? "now" : "later",
    // delivery_date = scheduled courier PICKUP date, always the next working day.
    // Standard e-commerce flow: customer pays → store packs → courier picks up NEXT day.
    // Never use today — cutoffs vary per courier/area and we can't predict them.
    // Skip Sunday (Indonesian couriers don't pick up on Sundays).
    ...(!isOnDemand &&
      (() => {
        const wibFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" });
        let pickup = new Date(Date.now() + 24 * 60 * 60 * 1000); // tomorrow
        const wibStr = wibFmt.format(pickup); // "YYYY-MM-DD"
        const [y, m, d] = wibStr.split("-").map(Number);
        if (new Date(y, m - 1, d).getDay() === 0) {
          // Sunday → Monday
          pickup = new Date(pickup.getTime() + 24 * 60 * 60 * 1000);
        }
        return {
          delivery_date: wibFmt.format(pickup),
          delivery_time: "09:00",
        };
      })()),
    order_note: params.orderNote ?? null,
    items: params.items.map((i) => ({
      name: i.name.slice(0, 100),
      description: i.name.slice(0, 255),
      value: Math.max(1000, Math.round(i.value)),
      quantity: i.quantity,
      weight: Math.max(1, Math.round(i.weight)),
      length: 10,
      width: 10,
      height: 10,
    })),
  };

  // Biteship's Create Order API requires coordinates as NESTED objects
  // (origin_coordinate / destination_coordinate), NOT the flat origin_latitude/
  // origin_longitude fields used by the rates endpoint. Instant/on-demand couriers
  // (GoSend, GrabExpress, etc.) are rejected without these.
  if (params.originLat !== undefined && params.originLng !== undefined) {
    body.origin_coordinate = { latitude: params.originLat, longitude: params.originLng };
  }
  if (params.destLat !== undefined && params.destLng !== undefined) {
    body.destination_coordinate = { latitude: params.destLat, longitude: params.destLng };
  }

  try {
    const res = await fetch(`${base}/v1/orders`, {
      method: "POST",
      headers: {
        Authorization: key.startsWith("Bearer ") ? key : `Bearer ${key}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const json = (await res.json()) as Record<string, unknown>;

    if (!res.ok || json.success === false) {
      const errMsg =
        (json.error as string) ?? (json.message as string) ?? `Biteship error ${res.status}`;
      console.error("[Biteship createOrder] failed", {
        status: res.status,
        error: errMsg,
        courier_company: body.courier_company,
        courier_type: body.courier_type,
        delivery_type: body.delivery_type,
        delivery_date: body.delivery_date,
        delivery_time: body.delivery_time,
        destination_postal_code: body.destination_postal_code,
      });
      return { ok: false, error: errMsg };
    }

    const courier = json.courier as Record<string, unknown> | undefined;

    return {
      ok: true,
      biteshipOrderId: json.id as string,
      awb: (courier?.waybill_id as string | null) ?? null,
      trackingId: (courier?.tracking_id as string | null) ?? null,
      status: (json.status as string) ?? "pending",
      courierName: (courier?.name as string | null) ?? null,
    };
  } catch (err) {
    console.error("[Biteship createOrder] network error", {
      courier_company: params.courierCompany,
      err,
    });
    return { ok: false, error: "Jaringan ke Biteship gagal." };
  }
}
