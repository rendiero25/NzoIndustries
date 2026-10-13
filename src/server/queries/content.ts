import "server-only";

import { unstable_cache } from "next/cache";

import { createPublicClient } from "@/lib/supabase/public";
import type { ContentPageSlug } from "@/lib/validations/admin-promo";

export const CONTENT_TAG = "content";

export type PublicContentPage = {
  title: string;
  body: string;
  metaDescription: string | null;
  updatedAt: string;
};

/**
 * Halaman statis yang sudah ditayangkan admin (D-39). null = belum tayang,
 * halaman publik memakai copy bawaan aplikasi.
 */
export const getContentPage = unstable_cache(
  async (slug: ContentPageSlug): Promise<PublicContentPage | null> => {
    const { data, error } = await createPublicClient()
      .from("content_pages")
      .select("title, body, meta_description, updated_at")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();
    if (error || !data || !data.body.trim()) return null;
    return {
      title: data.title,
      body: data.body,
      metaDescription: data.meta_description,
      updatedAt: data.updated_at,
    };
  },
  ["content-page"],
  { revalidate: 3600, tags: [CONTENT_TAG] },
);
