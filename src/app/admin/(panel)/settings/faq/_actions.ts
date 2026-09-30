"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";

export type FaqFormData = {
  question: string;
  answer: string;
  category: string;
  sort_order: number;
  is_active: boolean;
};

export async function createFaq(data: FaqFormData): Promise<{ error?: string; id?: string }> {
  if (!data.question.trim()) return { error: "Pertanyaan wajib diisi." };
  if (!data.answer.trim()) return { error: "Jawaban wajib diisi." };

  const supabase = await createServiceClient();
  const { data: faq, error } = await supabase
    .from("faqs")
    .insert({
      question: data.question.trim(),
      answer: data.answer.trim(),
      category: data.category.trim() || null,
      sort_order: data.sort_order,
      is_active: data.is_active,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/admin/settings/faq");
  revalidatePath("/syarat-ketentuan");
  return { id: faq.id };
}

export async function updateFaq(id: string, data: FaqFormData): Promise<{ error?: string }> {
  if (!data.question.trim()) return { error: "Pertanyaan wajib diisi." };
  if (!data.answer.trim()) return { error: "Jawaban wajib diisi." };

  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("faqs")
    .update({
      question: data.question.trim(),
      answer: data.answer.trim(),
      category: data.category.trim() || null,
      sort_order: data.sort_order,
      is_active: data.is_active,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/settings/faq");
  revalidatePath("/syarat-ketentuan");
  return {};
}

export async function deleteFaq(id: string): Promise<{ error?: string }> {
  const supabase = await createServiceClient();
  const { error } = await supabase.from("faqs").delete().eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/settings/faq");
  revalidatePath("/syarat-ketentuan");
  return {};
}

export async function toggleFaqActive(id: string, isActive: boolean): Promise<{ error?: string }> {
  const supabase = await createServiceClient();
  const { error } = await supabase.from("faqs").update({ is_active: isActive }).eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/settings/faq");
  revalidatePath("/syarat-ketentuan");
  return {};
}
