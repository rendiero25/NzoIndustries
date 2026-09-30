import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ComplaintMessage = {
  id: string;
  sender_id: string;
  sender_role: "user" | "admin";
  message: string;
  created_at: string;
};

export type ReturnDetail = {
  id: string;
  status: string;
  return_awb: string | null;
  return_courier: string | null;
  proof_images: string[];
  created_at: string;
  return_shipments: {
    id: string;
    awb_number: string | null;
    courier: string | null;
    status: string | null;
  }[];
};

export type ComplaintWithThread = {
  id: string;
  complaint_number: string;
  category: string;
  reason: string;
  description: string | null;
  status: string;
  images: string[];
  created_at: string;
  messages: ComplaintMessage[];
  return: ReturnDetail | null;
};

/** Complaint statuses that mean "still being handled" — not yet resolved/rejected. */
export const OPEN_COMPLAINT_STATUSES = ["open", "in_review", "return_approved"] as const;

/** Fetch complaint + messages + return for a given order (user-scoped via RLS). */
export async function fetchComplaintForOrder(orderId: string): Promise<ComplaintWithThread | null> {
  const supabase = await createClient();

  const { data: complaint } = await supabase
    .from("complaints")
    .select("id, complaint_number, category, reason, description, status, images, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!complaint) return null;

  const [msgRes, returnRes] = await Promise.all([
    supabase
      .from("complaint_messages")
      .select("id, sender_id, sender_role, message, created_at")
      .eq("complaint_id", complaint.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("returns")
      .select(
        "id, status, return_awb, return_courier, proof_images, created_at, return_shipments(id, awb_number, courier, status)",
      )
      .eq("complaint_id", complaint.id)
      .maybeSingle(),
  ]);

  return {
    ...complaint,
    images: Array.isArray(complaint.images) ? (complaint.images as string[]) : [],
    messages: (msgRes.data ?? []) as ComplaintMessage[],
    return: returnRes.data
      ? {
          ...returnRes.data,
          proof_images: Array.isArray(returnRes.data.proof_images)
            ? (returnRes.data.proof_images as string[])
            : [],
          return_shipments: Array.isArray(returnRes.data.return_shipments)
            ? (returnRes.data.return_shipments as ReturnDetail["return_shipments"])
            : [],
        }
      : null,
  };
}

/** Order ids among `orderIds` that currently have a still-open complaint (RLS-scoped to the caller). */
export async function fetchOpenComplaintOrderIds(orderIds: string[]): Promise<Set<string>> {
  if (orderIds.length === 0) return new Set();
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("complaints")
      .select("order_id")
      .in("order_id", orderIds)
      .in("status", OPEN_COMPLAINT_STATUSES);
    return new Set((data ?? []).map((c) => c.order_id));
  } catch {
    return new Set();
  }
}
