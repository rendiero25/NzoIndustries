import { checkRole } from "@/lib/auth/guards";
import { ORDER_NUMBER_RE } from "@/lib/pdf/format";
import { pdfResponse, renderInvoicePdf } from "@/lib/pdf/render";
import { getInvoiceOrder, getStoreInfo } from "@/server/queries/documents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /admin/orders/[number]/invoice — invoice PDF untuk staf pesanan/CS. */
export async function GET(_req: Request, { params }: { params: Promise<{ number: string }> }) {
  const { decision } = await checkRole(["owner", "admin", "warehouse", "cs"]);
  if (!decision.ok) return new Response("Forbidden", { status: 403 });
  const { number } = await params;
  if (!ORDER_NUMBER_RE.test(number)) return new Response("Tidak ditemukan", { status: 404 });

  const order = await getInvoiceOrder(number);
  if (!order) return new Response("Invoice belum terbit (pesanan belum lunas).", { status: 404 });
  const pdf = await renderInvoicePdf(order, await getStoreInfo());
  return pdfResponse(pdf, order.invoiceNumber!);
}
