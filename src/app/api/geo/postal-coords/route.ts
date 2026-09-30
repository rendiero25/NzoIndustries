import { z } from "zod";

import { fetchCoordinatesFromPostal } from "@/lib/geo/geocode-destination";

const schema = z.object({ postalCode: z.string().trim().min(3).max(10) });

export async function POST(req: Request) {
  try {
    const json: unknown = await req.json();
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return Response.json({ success: false, error: "Permintaan tidak valid." }, { status: 400 });
    }
    const coords = await fetchCoordinatesFromPostal(parsed.data.postalCode);
    return Response.json({ success: true, data: coords });
  } catch {
    return Response.json({ success: false, error: "Gagal mencari koordinat." }, { status: 500 });
  }
}
