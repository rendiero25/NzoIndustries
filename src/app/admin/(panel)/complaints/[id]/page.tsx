import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/legacy/server";
import { ComplaintDetailView, type ComplaintDetail } from "./_components/complaint-detail";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("complaints")
    .select("complaint_number")
    .eq("id", id)
    .maybeSingle();
  return {
    title: `${data?.complaint_number ?? `Komplain #${id.slice(0, 8)}`} — Admin NZO Industries`,
  };
}

export default async function AdminComplaintDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: complaint } = await supabase
    .from("complaints")
    .select(
      `id, complaint_number, type, category, reason, description, status, admin_note, images, created_at, resolved_at, user_id,
       orders:order_id (id, order_number, shipping_address, shipping_postal, recipient_phone, recipient_name, order_items(product_name, price, quantity, variant_id, weight)),
       profiles:user_id (full_name, phone),
       complaint_messages(id, sender_id, sender_role, message, created_at),
       returns(id, status, return_awb, return_courier, proof_images, created_at, updated_at, return_shipments(id, awb_number, courier, status))`,
    )
    .eq("id", id)
    .single();

  if (!complaint) notFound();

  // Supabase returns nested one-to-many as arrays; normalise `returns` to a single object or null
  const rawReturns = (complaint as Record<string, unknown>).returns;
  const returnsNormalized = Array.isArray(rawReturns)
    ? (rawReturns[0] ?? null)
    : (rawReturns ?? null);

  const complaintData = {
    ...complaint,
    returns: returnsNormalized,
  } as ComplaintDetail;

  return <ComplaintDetailView complaint={complaintData} />;
}
