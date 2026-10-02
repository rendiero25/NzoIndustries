"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { createCategory, updateCategory } from "../_actions";

const formSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").max(100, "Nama max 100 karakter"),
  slug: z
    .string()
    .min(1, "Slug wajib diisi")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug: huruf kecil, angka, dan tanda hubung"),
  parent_id: z.string(),
  sort_order: z.number().int().min(0),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

type ParentCategory = { id: string; name: string };

interface CategoryFormProps {
  parentCategories: ParentCategory[];
  categoryId?: string;
  defaultValues?: Partial<FormValues>;
}

const labelClass = "text-[11px] font-semibold text-foreground";

export function CategoryForm({ parentCategories, categoryId, defaultValues }: CategoryFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
      parent_id: "",
      sort_order: 0,
      is_active: true,
      ...defaultValues,
    },
  });

  const isActive = watch("is_active");

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      const payload = {
        ...values,
        parent_id: values.parent_id || null,
        image_url: null,
      };

      const result = categoryId
        ? await updateCategory(categoryId, payload)
        : await createCategory(payload);

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success(categoryId ? "Kategori diperbarui." : "Kategori berhasil dibuat.");
      router.push("/admin/categories");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="admin-utility-card overflow-hidden p-0">
        <div className="admin-utility-card-header">
          <h2 className="admin-section-title">Info Dasar</h2>
        </div>
        <div className="space-y-5 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name" className={labelClass}>
                Nama <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                className="h-10 rounded-lg border-border text-base leading-[1.47]"
                placeholder="Contoh: Laptop"
                {...register("name", {
                  onChange: (e) => {
                    if (!categoryId) {
                      setValue("slug", slugify(e.target.value), { shouldValidate: false });
                    }
                  },
                })}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="slug" className={labelClass}>
                Slug <span className="text-destructive">*</span>
              </Label>
              <Input
                id="slug"
                className="h-10 rounded-lg border-border font-mono text-base leading-[1.47]"
                placeholder="laptop"
                {...register("slug")}
              />
              {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="parent_id" className={labelClass}>
              Kategori Induk
            </Label>
            <select
              id="parent_id"
              {...register("parent_id")}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-base text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <option value="">— Tidak ada (kategori utama) —</option>
              {parentCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground">
              Kosongkan jika ini adalah kategori tingkat pertama.
            </p>
          </div>

          <div className="w-36 space-y-1.5">
            <Label htmlFor="sort_order" className={labelClass}>
              Urutan Tampil
            </Label>
            <Input
              id="sort_order"
              type="number"
              min="0"
              className="h-10 rounded-lg border-border text-base"
              {...register("sort_order", { valueAsNumber: true })}
            />
            {errors.sort_order && (
              <p className="text-xs text-destructive">{errors.sort_order.message}</p>
            )}
          </div>
        </div>
      </div>

      <div className="admin-utility-card p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="admin-section-title">Status Aktif</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Kategori nonaktif tidak tampil di toko.
            </p>
          </div>
          <Switch checked={isActive} onCheckedChange={(v) => setValue("is_active", v)} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push("/admin/categories")}
          disabled={isLoading}
        >
          Batal
        </Button>
        <Button type="submit" variant="primary" loading={isLoading}>
          {categoryId ? "Simpan Perubahan" : "Buat Kategori"}
        </Button>
      </div>
    </form>
  );
}
