"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPillToggle } from "@/components/ui/status-pill-toggle";
import { createFaq, updateFaq, type FaqFormData } from "../_actions";

const labelClass = "text-[11px] font-semibold uppercase text-muted-foreground";

type FaqFormProps = {
  initialData?: {
    id: string;
    question: string;
    answer: string;
    category: string | null;
    sort_order: number;
    is_active: boolean;
  };
};

export function FaqForm({ initialData }: FaqFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [question, setQuestion] = useState(initialData?.question ?? "");
  const [answer, setAnswer] = useState(initialData?.answer ?? "");
  const [category, setCategory] = useState(initialData?.category ?? "");
  const [sortOrder, setSortOrder] = useState(String(initialData?.sort_order ?? 0));
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      toast.error("Pertanyaan wajib diisi.");
      return;
    }
    if (!answer.trim()) {
      toast.error("Jawaban wajib diisi.");
      return;
    }

    const data: FaqFormData = {
      question: question.trim(),
      answer: answer.trim(),
      category: category.trim(),
      sort_order: parseInt(sortOrder, 10) || 0,
      is_active: isActive,
    };

    startTransition(async () => {
      if (initialData) {
        const { error } = await updateFaq(initialData.id, data);
        if (error) {
          toast.error(error);
          return;
        }
        toast.success("FAQ diperbarui.");
      } else {
        const { error } = await createFaq(data);
        if (error) {
          toast.error(error);
          return;
        }
        toast.success("FAQ berhasil dibuat.");
      }
      router.push("/admin/settings/faq");
    });
  };

  const areaClass =
    "w-full resize-none rounded-lg border border-[#e0e0e0] bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="admin-utility-card overflow-hidden p-0">
        <div className="admin-utility-card-header">
          <h2 className="admin-section-title">Detail FAQ</h2>
        </div>
        <div className="space-y-4 p-6">
          <div className="space-y-1.5">
            <label className={labelClass}>Pertanyaan *</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Bagaimana cara melakukan pemesanan?"
              rows={2}
              required
              className={areaClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Jawaban *</label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Jawaban lengkap untuk pertanyaan ini..."
              rows={5}
              required
              className={areaClass}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className={labelClass}>Kategori</label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="pengiriman, pembayaran, retur, dll"
                className="h-10 rounded-lg border-[#e0e0e0] text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>Urutan Tampil</label>
              <Input
                type="number"
                min={0}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="h-10 rounded-lg border-[#e0e0e0] text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className={labelClass}>Status</label>
            <StatusPillToggle
              active={isActive}
              onToggle={() => setIsActive((v) => !v)}
              activeLabel="Aktif"
              inactiveLabel="Nonaktif"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="primary" size="sm" loading={isPending}>
          {initialData ? "Perbarui FAQ" : "Buat FAQ"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => router.push("/admin/settings/faq")}
          disabled={isPending}
        >
          Batal
        </Button>
      </div>
    </form>
  );
}
