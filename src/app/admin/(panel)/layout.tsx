import { cookies } from "next/headers";

import { AdminShell } from "@/components/layout/admin-shell";
import { isStaffRole } from "@/lib/auth/access";
import { requireStaff } from "@/lib/auth/guards";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  // Proteksi di server (bukan hanya proxy). MFA mengikuti flag D-20.
  const user = await requireStaff();
  const role = isStaffRole(user.role) ? user.role : "cs";

  const cookieStore = await cookies();
  const sidebarDefaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <AdminShell
      sidebarDefaultOpen={sidebarDefaultOpen}
      role={role}
      name={user.fullName}
      email={user.email}
    >
      {children}
    </AdminShell>
  );
}
