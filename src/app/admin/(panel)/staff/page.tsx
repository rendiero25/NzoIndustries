import type { Metadata } from "next";

import { StaffManager } from "@/components/admin/system/staff-manager";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/auth/guards";
import { listStaff } from "@/server/queries/admin/system";

export const metadata: Metadata = { title: "Staf & role" };
export const dynamic = "force-dynamic";

export default async function AdminStaffPage() {
  const user = await requireRole(["owner", "admin"]);
  const staff = await listStaff();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Staf & role"
        description="Akun yang punya akses ke panel admin dan perannya."
      />
      <StaffManager staff={staff} currentUserId={user.id} isOwner={user.role === "owner"} />
    </div>
  );
}
