import { z } from "zod";

import { checkRole } from "@/lib/auth/guards";
import { ORDER_NUMBER_RE } from "@/lib/pdf/format";
import { pdfResponse, renderLabelsPdf } from "@/lib/pdf/render";
import { getLabelOrders, getStoreInfo } from "@/server/queries/documents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const numbersSchema = z
  .string()
  .transform((v) => [
    ...new Set(
      v
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean),
    ),
  ])
  .pipe(z.array(z.string().regex(ORDER_NUMBER_RE)).min(1).max(50));

/**
 * GET /admin/orders/labels?numbers=NZO-…,NZO-… — resi A5, satu pesanan per halaman.
 * Hanya pesanan paid/processing/shipped; maks 50 per cetak.
 */
export async function GET(req: Request) {
  const { decision } = await checkRole(["owner", "admin", "warehouse"]);
  if (!decision.ok) return new Response("Forbidden", { status: 403 });

  const parsed = numbersSchema.safeParse(new URL(req.url).searchParams.get("numbers") ?? "");
  if (!parsed.success)
    return new Response("Daftar pesanan tidak valid (maks 50).", { status: 400 });

  const orders = await getLabelOrders(parsed.data);
  if (!orders.length)
    return new Response("Tidak ada pesanan siap kirim di daftar ini.", { status: 404 });
  const pdf = await renderLabelsPdf(orders, await getStoreInfo());
  const name =
    orders.length === 1 ? `resi-${orders[0]!.orderNumber}` : `resi-${orders.length}-pesanan`;
  return pdfResponse(pdf, name);
}
