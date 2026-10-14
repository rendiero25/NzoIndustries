import { checkRole } from "@/lib/auth/guards";
import { ORDER_NUMBER_RE } from "@/lib/pdf/format";
import { pdfResponse, renderInvoicePdf } from "@/lib/pdf/render";
import { getInvoiceOrder, getStoreInfo } from "@/server/queries/documents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /account/orders/[number]/invoice — invoice PDF milik pelanggan (D-41).
 * RLS membatasi ke pesanan sendiri; 404 bila bukan miliknya atau belum lunas.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ number: string }> }) {
  const { user } = await checkRole(["customer", "owner", "admin", "warehouse", "cs"]);
  if (!user) return new Response("Masuk dulu untuk mengunduh invoice.", { status: 401 });
  const { number } = await params;
  if (!ORDER_NUMBER_RE.test(number)) return new Response("Tidak ditemukan", { status: 404 });

  const order = await getInvoiceOrder(number);
  if (!order) return new Response("Tidak ditemukan", { status: 404 });
  const pdf = await renderInvoicePdf(order, await getStoreInfo());
  return pdfResponse(pdf, order.invoiceNumber!, "attachment");
}
