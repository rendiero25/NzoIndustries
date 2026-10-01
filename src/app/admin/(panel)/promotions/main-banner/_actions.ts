"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/legacy/server";

export type BannerRow = {
  id: string;
  title: string | null;
  image_url: string;
  link_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export type AddBannerData = {
  title: string | null;
  image_url: string;
  link_url: string | null;
  is_active: boolean;
  sort_order: number;
};

export async function addBanner(data: AddBannerData): Promise<{ error?: string }> {
  if (!data.image_url.trim()) return { error: "Gambar banner wajib diisi." };

  const supabase = createServiceClient();
  const { error } = await supabase.from("banners").insert({
    title: data.title?.trim() || null,
    image_url: data.image_url.trim(),
    link_url: data.link_url?.trim() || null,
    is_active: data.is_active,
    sort_order: data.sort_order,
    starts_at: null,
    ends_at: null,
    template: "main_banner",
  });

  if (error) return { error: error.message };
  revalidatePath("/admin/promotions/main-banner");
  revalidatePath("/");
  return {};
}

export async function listBanners(): Promise<BannerRow[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("banners")
    .select("id, title, image_url, link_url, is_active, sort_order, created_at")
    .eq("template", "main_banner")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  return (data ?? []) as BannerRow[];
}

export type UpdateBannerData = {
  title: string | null;
  image_url: string;
  link_url: string | null;
  is_active: boolean;
  sort_order: number;
};

export async function updateBanner(
  id: string,
  data: UpdateBannerData,
): Promise<{ error?: string }> {
  if (!data.image_url.trim()) return { error: "Gambar banner wajib diisi." };

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("banners")
    .update({
      title: data.title?.trim() || null,
      image_url: data.image_url.trim(),
      link_url: data.link_url?.trim() || null,
      is_active: data.is_active,
      sort_order: data.sort_order,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/promotions/main-banner");
  revalidatePath("/");
  return {};
}

export async function deleteBanner(id: string): Promise<{ error?: string }> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("banners").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/promotions/main-banner");
  revalidatePath("/");
  return {};
}

export async function toggleBannerStatus(
  id: string,
  isActive: boolean,
): Promise<{ error?: string }> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("banners").update({ is_active: isActive }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/promotions/main-banner");
  revalidatePath("/");
  return {};
}
