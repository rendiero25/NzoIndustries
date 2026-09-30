import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { DEFAULT_STORE_ORIGIN, parseStoreOrigin, type StoreOrigin } from "./store-origin";

export const getStoreOrigin = cache(async (): Promise<StoreOrigin> => {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "store_origin")
      .maybeSingle();
    return parseStoreOrigin(data?.value);
  } catch {
    return DEFAULT_STORE_ORIGIN;
  }
});

export const getWhatsappCs = cache(async (): Promise<string> => {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "whatsapp_cs")
      .maybeSingle();
    return typeof data?.value === "string" ? data.value : "";
  } catch {
    return "";
  }
});
