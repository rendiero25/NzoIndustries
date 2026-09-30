import { z } from "zod";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { reconcileMayarPayment } from "@/lib/payments/reconcile-mayar";

const paramsSchema = z.object({ id: z.string().uuid() });

/**
 * POST /api/orders/[id]/verify-payment
 *
 * Fallback for a late or missed Mayar webhook: re-checks the payment request
 * status with Mayar and settles the order when it is paid.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const parsed = paramsSchema.safeParse(await params);
    if (!parsed.success) {
      return Response.json({ success: false, error: "Permintaan tidak valid." }, { status: 400 });
    }
    const orderId = parsed.data.id;

    const auth = await createClient();
    const {
      data: { user },
    } = await auth.auth.getUser();
    if (!user) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Fetch order — must belong to this user
    const { data: order } = await auth
      .from("orders")
      .select("id, status")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!order) {
      return Response.json({ success: false, error: "Pesanan tidak ditemukan." }, { status: 404 });
    }

    // Already updated — return early
    if (order.status !== "pending_payment") {
      return Response.json({ success: true, data: { status: order.status } });
    }

    const svc = createServiceClient();
    const { data: payment } = await svc
      .from("payments")
      .select("order_id, mayar_payment_id, mayar_transaction_id, gross_amount")
      .eq("order_id", order.id)
      .not("mayar_payment_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!payment) {
      return Response.json(
        { success: false, error: "Data pembayaran tidak ditemukan." },
        { status: 404 },
      );
    }

    const result = await reconcileMayarPayment(payment);
    if (result.status === "error") {
      return Response.json(
        { success: false, error: "Tidak dapat memverifikasi pembayaran." },
        { status: 502 },
      );
    }
    if (result.status !== "paid") {
      return Response.json(
        { success: false, error: "Pembayaran belum dikonfirmasi." },
        { status: 400 },
      );
    }

    return Response.json({ success: true, data: { status: "paid" } });
  } catch {
    return Response.json({ success: false, error: "Terjadi kesalahan server." }, { status: 500 });
  }
}
