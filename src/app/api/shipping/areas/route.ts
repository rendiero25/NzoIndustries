import { z } from "zod";

const schema = z.object({ q: z.string().min(2).max(80) });

type BiteshipAreasResponse = {
  success?: boolean;
  areas?: unknown[];
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = schema.safeParse({ q: searchParams.get("q") ?? "" });
    if (!parsed.success) {
      return Response.json({ success: false, areas: [] }, { status: 400 });
    }

    const key = process.env.BITESHIP_API_KEY?.trim();
    if (!key) {
      return Response.json({ success: false, error: "Biteship tidak dikonfigurasi.", areas: [] });
    }

    const url = `https://api.biteship.com/v1/maps/areas?countries=ID&input=${encodeURIComponent(parsed.data.q)}&type=single`;
    const res = await fetch(url, {
      headers: {
        Authorization: key.startsWith("Bearer ") ? key : `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 300 },
    });

    const json = (await res.json()) as BiteshipAreasResponse;
    if (!res.ok || !json.success) {
      return Response.json({ success: false, areas: [] });
    }

    return Response.json({ success: true, areas: json.areas ?? [] });
  } catch {
    return Response.json({ success: false, areas: [] }, { status: 500 });
  }
}
