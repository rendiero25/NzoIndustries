"use client";

import { useCallback, useEffect, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export type AdminSidebarCounts = {
  complaints: number;
  returns: number;
  stock: number;
  notifications: number;
};

const EMPTY_COUNTS: AdminSidebarCounts = {
  complaints: 0,
  returns: 0,
  stock: 0,
  notifications: 0,
};

export function useAdminSidebarCounts() {
  const [counts, setCounts] = useState<AdminSidebarCounts>(EMPTY_COUNTS);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/sidebar-counts");
      const json = (await response.json()) as {
        success?: boolean;
        counts?: Partial<AdminSidebarCounts>;
      };

      if (!response.ok || !json.success || !json.counts) return;
      setCounts({
        complaints: Math.max(0, json.counts.complaints ?? 0),
        returns: Math.max(0, json.counts.returns ?? 0),
        stock: Math.max(0, json.counts.stock ?? 0),
        notifications: Math.max(0, json.counts.notifications ?? 0),
      });
    } catch {
      // Keep the last known counts while the connection recovers.
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    const polling = window.setInterval(() => void refresh(), 30_000);

    channel = supabase
      .channel("admin-sidebar-workload-counts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "complaints" },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "returns" },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "product_variants" },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_notifications" },
        () => void refresh(),
      )
      .subscribe();

    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(polling);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [refresh]);

  return counts;
}
