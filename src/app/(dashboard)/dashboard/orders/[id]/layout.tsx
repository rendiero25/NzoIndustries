import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/legacy/server";
import { fetchOrderDetailForUser } from "@/lib/data/dashboard-user";
import { OrderSubNav } from "@/components/dashboard/order-subnav";

export default async function DashboardOrderSegmentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?redirectTo=/dashboard/orders/${id}`);
  }

  const detail = await fetchOrderDetailForUser(user.id, id);
  if (!detail) notFound();

  return (
    <div className="w-full">
      <OrderSubNav
        orderId={id}
        orderNumber={detail.order.order_number}
        status={detail.order.status}
      />
      {children}
    </div>
  );
}
