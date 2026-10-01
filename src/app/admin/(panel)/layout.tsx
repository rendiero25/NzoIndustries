import { cookies } from "next/headers";

import { AdminShell } from "@/components/layout/admin-shell";
import { requireStaff } from "@/lib/auth/guards";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  // Proteksi di server (bukan hanya proxy): staf + MFA aal2 wajib.
  await requireStaff();

  const cookieStore = await cookies();
  const sidebarState = cookieStore.get("sidebar:state")?.value;
  const sidebarDefaultOpen = sidebarState !== "false";

  return <AdminShell sidebarDefaultOpen={sidebarDefaultOpen}>{children}</AdminShell>;
}
