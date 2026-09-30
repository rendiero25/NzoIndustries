import { cookies } from "next/headers";

import { AdminShell } from "@/components/layout/admin-shell";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const sidebarState = cookieStore.get("sidebar:state")?.value;
  const sidebarDefaultOpen = sidebarState !== "false";

  return <AdminShell sidebarDefaultOpen={sidebarDefaultOpen}>{children}</AdminShell>;
}
