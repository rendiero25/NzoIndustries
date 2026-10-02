"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, X, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUploader, type ImageItem } from "./image-uploader";
import { VariantImagePicker } from "./variant-image-picker";
import { createProduct, updateProduct } from "../_actions";
import { cn } from "@/lib/utils";

const inputClass = "h-10 rounded-lg border-border";
const textareaClass = "resize-none rounded-lg border-border";
const selectTriggerClass = "h-10 rounded-lg border-border";
const variantInputClass = "h-9 rounded-lg border-border text-sm";

// ─── Schemas ────────────────────────────────────────────────────────────────

const variantSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nama varian wajib diisi"),
  sku: z.string().trim().min(1, "SKU wajib diisi"),
  price: z.number().min(0, "Harga tidak boleh negatif"),
  stock: z.number().min(0, "Stok tidak boleh negatif"),
  weight: z.number().min(1, "Berat minimal 1 gram"),
  length: z.number().min(0),
  width: z.number().min(0),
  height: z.number().min(0),
  is_active: z.boolean(),
  image_url: z.string().min(1, "Foto varian wajib diisi"),
});

const productSchema = z.object({
  name: z.string().min(1, "Nama produk wajib diisi"),
  slug: z
    .string()
    .min(1, "Slug wajib diisi")
    .regex(/^[a-z0-9-]+$/, "Slug hanya huruf kecil, angka, dan tanda -"),
  description: z.string(),
  base_price: z.number().min(0, "Harga dasar tidak boleh negatif"),
  min_order_qty: z.number().min(1, "Min. order minimal 1"),
  category_id: z.string().nullable(),
  brand_id: z.string().nullable(),
  condition: z.enum(["new", "second"]),
  is_active: z.boolean(),
  is_featured: z.boolean(),
  meta_title: z.string(),
  meta_description: z.string(),
  variants: z.array(variantSchema).min(1, "Minimal 1 varian wajib diisi"),
});

type FormValues = {
  name: string;
  slug: string;
  description: string;
  base_price: number;
  min_order_qty: number;
  category_id: string | null;
  brand_id: string | null;
  condition: "new" | "second";
  is_active: boolean;
  is_featured: boolean;
  meta_title: string;
  meta_description: string;
  variants: {
    id?: string;
    name: string;
    sku: string;
    price: number;
    stock: number;
    weight: number;
    length: number;
    width: number;
    height: number;
    is_active: boolean;
    image_url: string;
  }[];
};

// ─── Draft persistence ───────────────────────────────────────────────────────

const DRAFT_KEY = "product-new-draft";

type FormDraft = {
  formValues?: Partial<FormValues>;
  images?: ImageItem[];
  tags?: string[];
};

// ─── Types ───────────────────────────────────────────────────────────────────

type Category = { id: string; name: string };
type Brand = { id: string; name: string };

type DefaultProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  base_price: number;
  sale_price: number | null;
  min_order_qty: number;
  category_id: string | null;
  brand_id?: string | null;
  condition?: "new" | "second" | null;
  is_active: boolean;
  is_featured: boolean;
  meta_title: string | null;
  meta_description: string | null;
};

type DefaultVariant = {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  weight: number;
  length: number;
  width: number;
  height: number;
  is_active: boolean;
  image_url: string;
};

interface ProductFormProps {
  categories: Category[];
  brands: Brand[];
  defaultProduct?: DefaultProduct;
  defaultImages?: ImageItem[];
  defaultVariants?: DefaultVariant[];
  defaultTags?: string[];
}

// ─── Slug generator ──────────────────────────────────────────────────────────

function toSlug(str: string) {
  return str
    .toLowerCase()
    .replace(/[àáâãäå]/g, "a")
    .replace(/[èéêë]/g, "e")
    .replace(/[ìíîï]/g, "i")
    .replace(/[òóôõö]/g, "o")
    .replace(/[ùúûü]/g, "u")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// ─── Form ────────────────────────────────────────────────────────────────────

export function ProductForm({
  categories,
  brands,
  defaultProduct,
  defaultImages = [],
  defaultVariants = [],
  defaultTags = [],
}: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isEdit = !!defaultProduct;

  // Baca draft sekali saat mount (hanya untuk mode tambah produk baru)
  const [savedDraft] = useState<FormDraft | null>(() => {
    if (isEdit || typeof window === "undefined") return null;
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as FormDraft;
    } catch (_e) {
      // Data corrupt → hapus agar tidak terus memicu error
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch (_) {}
      return null;
    }
  });

  const [images, setImages] = useState<ImageItem[]>(savedDraft?.images ?? defaultImages);
  const [tags, setTags] = useState<string[]>(savedDraft?.tags ?? defaultTags);
  const [tagInput, setTagInput] = useState("");
  const [expandedVariants, setExpandedVariants] = useState<number[]>([0]);

  const dv = savedDraft?.formValues;

  const form = useForm<FormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: dv?.name ?? defaultProduct?.name ?? "",
      slug: dv?.slug ?? defaultProduct?.slug ?? "",
      description: dv?.description ?? defaultProduct?.description ?? "",
      base_price: dv?.base_price ?? defaultProduct?.base_price ?? 0,
      min_order_qty: dv?.min_order_qty ?? defaultProduct?.min_order_qty ?? 1,
      category_id: dv?.category_id ?? defaultProduct?.category_id ?? null,
      brand_id: dv?.brand_id ?? defaultProduct?.brand_id ?? null,
      condition: dv?.condition ?? (defaultProduct?.condition === "second" ? "second" : "new"),
      is_active: dv?.is_active ?? defaultProduct?.is_active ?? true,
      is_featured: dv?.is_featured ?? defaultProduct?.is_featured ?? false,
      meta_title: dv?.meta_title ?? defaultProduct?.meta_title ?? "",
      meta_description: dv?.meta_description ?? defaultProduct?.meta_description ?? "",
      variants:
        dv?.variants && dv.variants.length > 0
          ? dv.variants
          : defaultVariants.length > 0
            ? defaultVariants
            : [
                {
                  name: "Default",
                  sku: "",
                  price: 0,
                  stock: 0,
                  weight: 500,
                  length: 0,
                  width: 0,
                  height: 0,
                  is_active: true,
                  image_url: "",
                },
              ],
    },
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    setError,
    clearErrors,
    formState: { errors, dirtyFields },
  } = form;

  // Varian pertama otomatis ikut Harga Dasar selama admin belum mengubahnya
  // sendiri (dirtyFields tetap false karena setValue di bawah tidak memicu shouldDirty).
  const basePriceWatch = watch("base_price");
  useEffect(() => {
    if (isEdit) return;
    if (dirtyFields.variants?.[0]?.price) return;
    setValue("variants.0.price", basePriceWatch);
  }, [basePriceWatch, isEdit, dirtyFields.variants, setValue]);

  // keyName diubah dari default "id" ke "_key" agar tidak bentrok dengan field
  // data "id" (UUID varian di database). Tanpa ini, RHF memakai field "id" sebagai
  // internal tracker sehingga values.variants[i].id bisa tidak terbaca saat submit,
  // yang menyebabkan server action memperlakukan semua varian sebagai INSERT baru.
  const { fields, append, remove } = useFieldArray({ control, name: "variants", keyName: "_key" });

  // ── Draft persistence ─────────────────────────────────────────────────────
  // Gunakan ref agar form.watch callback selalu dapat nilai terbaru images/tags
  // tanpa perlu re-subscribe setiap kali state berubah.
  const latestImages = useRef(images);
  const latestTags = useRef(tags);
  latestImages.current = images;
  latestTags.current = tags;

  // Simpan perubahan field form ke sessionStorage (subscribe tanpa re-render)
  useEffect(() => {
    if (isEdit) return;
    const sub = watch((values) => {
      try {
        sessionStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({
            formValues: values,
            images: latestImages.current,
            tags: latestTags.current,
          }),
        );
      } catch (_e) {
        /* sessionStorage penuh / tidak tersedia → abaikan */
      }
    });
    return () => sub.unsubscribe();
  }, [watch, isEdit]);

  // Simpan images & tags ke draft saat keduanya berubah di luar form.watch
  useEffect(() => {
    if (isEdit) return;
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      const current: FormDraft = raw ? JSON.parse(raw) : {};
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...current, images, tags }));
    } catch (_e) {
      // Data corrupt → tulis ulang bersih
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ images, tags }));
      } catch (_) {}
    }
  }, [images, tags, isEdit]);

  // Auto-generate slug from name (only for new products)
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!isEdit) setValue("slug", toSlug(val));
  };

  // Tag input handlers
  const addTag = (raw: string) => {
    const trimmed = raw.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setTagInput("");
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    }
    if (e.key === "Backspace" && tagInput === "" && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  };

  const toggleVariantExpand = (i: number) => {
    setExpandedVariants((prev) => (prev.includes(i) ? prev.filter((n) => n !== i) : [...prev, i]));
  };

  const onSubmit = async (values: FormValues) => {
    if (images.length === 0) {
      toast.warning("Tambahkan minimal 1 gambar produk.");
      return;
    }

    // Cek duplikat SKU antar varian dalam form — dilakukan manual di sini
    // (bukan via Zod superRefine) untuk menghindari issue kompabilitas
    // @hookform/resolvers v5 + Zod v4 pada nested array error path.
    clearErrors("variants");
    const seenSkus = new Map<string, number>();
    let hasDuplicateSku = false;
    values.variants.forEach((v, i) => {
      const key = v.sku.trim().toLowerCase();
      if (!key) return;
      if (seenSkus.has(key)) {
        setError(`variants.${i}.sku`, {
          type: "manual",
          message: `SKU duplikat dengan varian ${seenSkus.get(key)! + 1}`,
        });
        hasDuplicateSku = true;
      } else {
        seenSkus.set(key, i);
      }
    });
    if (hasDuplicateSku) return;

    const payload = {
      name: values.name,
      slug: values.slug,
      description: values.description,
      base_price: values.base_price,
      sale_price: null,
      min_order_qty: values.min_order_qty,
      category_id: values.category_id,
      brand_id: values.brand_id,
      condition: values.condition,
      is_active: values.is_active,
      is_featured: values.is_featured,
      meta_title: values.meta_title,
      meta_description: values.meta_description,
      images: images.map((img, i) => ({ ...img, sort_order: i })),
      variants: values.variants.map((v) => ({ ...v, sku: v.sku.trim() })),
      tags,
    };

    startTransition(async () => {
      try {
        const result = isEdit
          ? await updateProduct(defaultProduct!.id, payload)
          : await createProduct(payload);

        if ("error" in result) {
          toast.error(result.error);
          return;
        }

        toast.success(isEdit ? "Produk berhasil diperbarui." : "Produk berhasil ditambahkan.");
        if (!isEdit) sessionStorage.removeItem(DRAFT_KEY);
        router.push("/admin/products");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Terjadi kesalahan. Coba lagi.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full">
      {/* ── 2xl: 2 kolom | <2xl: 1 kolom ────────────────────────────── */}
      <div className="flex flex-col gap-8 2xl:flex-row 2xl:items-start">
        {/* ── KOLOM KIRI: Info Dasar → Gambar ──────────────────────── */}
        <div className="min-w-0 space-y-8 2xl:flex-1">
          {/* Informasi Dasar */}
          <Section title="Informasi Dasar">
            <div className="space-y-4">
              <Field label="Nama Produk" error={errors.name?.message} required>
                <Input
                  {...register("name", { onChange: handleNameChange })}
                  placeholder="Contoh: Samsung Galaxy S25 Ultra"
                  className={inputClass}
                />
              </Field>

              <Field label="Slug (URL)" error={errors.slug?.message} required>
                <Input
                  {...register("slug")}
                  placeholder="samsung-galaxy-s25-ultra"
                  className={cn(inputClass, "font-mono text-sm")}
                />
              </Field>

              <Field label="Deskripsi" error={errors.description?.message}>
                <Textarea
                  {...register("description")}
                  placeholder="Deskripsi lengkap produk..."
                  rows={5}
                  className={textareaClass}
                />
              </Field>
            </div>
          </Section>

          {/* Harga */}
          <Section title="Harga">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Harga Dasar (Rp)" error={errors.base_price?.message} required>
                <Input
                  type="number"
                  {...register("base_price", { valueAsNumber: true })}
                  placeholder="0"
                  className={inputClass}
                />
              </Field>

              <Field label="Min. Pembelian (pcs)" error={errors.min_order_qty?.message}>
                <Input
                  type="number"
                  {...register("min_order_qty", { valueAsNumber: true })}
                  placeholder="1"
                  className={inputClass}
                />
              </Field>
            </div>
          </Section>

          {/* Kategori & Status */}
          <Section title="Kategori & Status">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Merek">
                <Select
                  value={watch("brand_id") ?? "__none__"}
                  onValueChange={(v) => setValue("brand_id", v === "__none__" ? null : v)}
                >
                  <SelectTrigger className={selectTriggerClass}>
                    <SelectValue placeholder="Pilih merek..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Tanpa Merek —</SelectItem>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Kategori">
                <Select
                  value={watch("category_id") ?? "__none__"}
                  onValueChange={(v) => setValue("category_id", v === "__none__" ? null : v)}
                >
                  <SelectTrigger className={selectTriggerClass}>
                    <SelectValue placeholder="Pilih kategori..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Tanpa Kategori —</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field label="Kondisi Produk" required>
              <SegmentedControl
                value={watch("condition")}
                onChange={(val) => setValue("condition", val)}
                fullWidth
                size="compact"
                aria-label="Kondisi produk"
                options={[
                  { value: "new", label: "Baru" },
                  { value: "second", label: "Second" },
                ]}
              />
            </Field>

            <div className="flex flex-col gap-3 pt-1">
              <div className="flex items-center gap-3">
                <Switch
                  id="is_active"
                  checked={watch("is_active")}
                  onCheckedChange={(v) => setValue("is_active", v)}
                />
                <Label htmlFor="is_active" className="cursor-pointer text-sm font-medium">
                  Produk aktif (tampil di toko)
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="is_featured"
                  checked={watch("is_featured")}
                  onCheckedChange={(v) => setValue("is_featured", v)}
                />
                <Label htmlFor="is_featured" className="cursor-pointer text-sm font-medium">
                  Produk unggulan (featured)
                </Label>
              </div>
            </div>
          </Section>
        </div>

        {/* ── KOLOM KANAN: Gambar → Varian → SEO + Submit ──────────── */}
        <div className="flex min-w-0 flex-col 2xl:flex-1">
          <div className="space-y-8">
            {/* Gambar Produk */}
            <Section title="Gambar Produk">
              <ImageUploader images={images} onChange={setImages} />
            </Section>

            {/* Varian Produk */}
            <Section title="Varian Produk">
              {errors.variants?.root?.message && (
                <p className="text-xs text-destructive">{errors.variants.root.message}</p>
              )}
              {typeof errors.variants?.message === "string" && (
                <p className="text-xs text-destructive">{errors.variants.message}</p>
              )}

              <div className="space-y-3">
                {fields.map((field, i) => {
                  const isExpanded = expandedVariants.includes(i);
                  const variantName = watch(`variants.${i}.name`) || `Varian ${i + 1}`;
                  const variantErrors = errors.variants?.[i];

                  return (
                    <div
                      key={field._key}
                      className="overflow-hidden rounded-lg border border-border"
                    >
                      <input type="hidden" {...register(`variants.${i}.id`)} />

                      <div
                        className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors select-none hover:bg-muted/50"
                        onClick={() => toggleVariantExpand(i)}
                      >
                        <span className="w-6 text-xs font-semibold text-muted-foreground uppercase">
                          {i + 1}
                        </span>
                        <span className="flex-1 text-sm font-semibold">{variantName}</span>

                        <Switch
                          checked={watch(`variants.${i}.is_active`)}
                          onCheckedChange={(v) => setValue(`variants.${i}.is_active`, v)}
                          onClick={(e) => e.stopPropagation()}
                        />

                        {fields.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              remove(i);
                              setExpandedVariants((prev) =>
                                prev.filter((n) => n !== i).map((n) => (n > i ? n - 1 : n)),
                              );
                            }}
                            className="p-1 text-muted-foreground transition-colors hover:text-destructive"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        {isExpanded ? (
                          <ChevronUp size={14} className="shrink-0" />
                        ) : (
                          <ChevronDown size={14} className="shrink-0" />
                        )}
                      </div>

                      {/* Variant body */}
                      {isExpanded && (
                        <div className="grid grid-cols-1 gap-3 border-t border-border px-4 pt-2 pb-4 sm:grid-cols-2 lg:grid-cols-3">
                          <Field
                            label="Foto Varian"
                            error={variantErrors?.image_url?.message}
                            required
                            className="sm:col-span-2 lg:col-span-3"
                          >
                            <VariantImagePicker
                              value={watch(`variants.${i}.image_url`)}
                              hasError={!!variantErrors?.image_url}
                              onChange={(url) =>
                                setValue(`variants.${i}.image_url`, url, { shouldValidate: true })
                              }
                            />
                          </Field>
                          <Field label="Nama Varian" error={variantErrors?.name?.message} required>
                            <Input
                              {...register(`variants.${i}.name`)}
                              placeholder="Default / Merah / 128GB"
                              className={variantInputClass}
                            />
                          </Field>
                          <Field label="SKU" error={variantErrors?.sku?.message} required>
                            <Input
                              {...register(`variants.${i}.sku`)}
                              placeholder="GT-SKU-001"
                              className={cn(variantInputClass, "font-mono")}
                            />
                          </Field>
                          <Field label="Harga (Rp)" error={variantErrors?.price?.message} required>
                            <Input
                              type="number"
                              {...register(`variants.${i}.price`, { valueAsNumber: true })}
                              placeholder="0"
                              className={variantInputClass}
                            />
                          </Field>
                          <Field label="Stok" error={variantErrors?.stock?.message} required>
                            <Input
                              type="number"
                              {...register(`variants.${i}.stock`, { valueAsNumber: true })}
                              placeholder="0"
                              className={variantInputClass}
                            />
                          </Field>
                          <Field
                            label="Berat (gram)"
                            error={variantErrors?.weight?.message}
                            required
                          >
                            <Input
                              type="number"
                              {...register(`variants.${i}.weight`, { valueAsNumber: true })}
                              placeholder="500"
                              className={variantInputClass}
                            />
                          </Field>
                          <Field label="Panjang (cm)" error={variantErrors?.length?.message}>
                            <Input
                              type="number"
                              {...register(`variants.${i}.length`, { valueAsNumber: true })}
                              placeholder="0"
                              className={variantInputClass}
                            />
                          </Field>
                          <Field label="Lebar (cm)" error={variantErrors?.width?.message}>
                            <Input
                              type="number"
                              {...register(`variants.${i}.width`, { valueAsNumber: true })}
                              placeholder="0"
                              className={variantInputClass}
                            />
                          </Field>
                          <Field label="Tinggi (cm)" error={variantErrors?.height?.message}>
                            <Input
                              type="number"
                              {...register(`variants.${i}.height`, { valueAsNumber: true })}
                              placeholder="0"
                              className={variantInputClass}
                            />
                          </Field>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="border-dashed"
                onClick={() => {
                  const nextIndex = fields.length;
                  const base = getValues("variants.0");
                  append({
                    name: "",
                    sku: "",
                    price: base?.price ?? 0,
                    stock: base?.stock ?? 0,
                    weight: base?.weight ?? 500,
                    length: base?.length ?? 0,
                    width: base?.width ?? 0,
                    height: base?.height ?? 0,
                    is_active: base?.is_active ?? true,
                    image_url: "",
                  });
                  setExpandedVariants((prev) => [...prev, nextIndex]);
                }}
              >
                <Plus size={13} className="mr-1.5" />
                Tambah Varian
              </Button>
            </Section>

            {/* Tags */}
            <Section title="Tags">
              <div className="space-y-2">
                <div className="flex min-h-9 flex-wrap gap-1.5 rounded-lg border border-border bg-transparent p-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 rounded-md border border-brand/30 bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand uppercase"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => setTags(tags.filter((t) => t !== tag))}
                        className="transition-opacity hover:opacity-60"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    onBlur={() => tagInput && addTag(tagInput)}
                    placeholder={tags.length === 0 ? "Ketik tag lalu tekan Enter atau koma..." : ""}
                    className="min-w-32 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Tekan Enter atau koma untuk menambah tag.
                </p>
              </div>
            </Section>

            {/* SEO */}
            <Section title="SEO (Opsional)">
              <div className="space-y-4">
                <Field label="Meta Title" error={errors.meta_title?.message}>
                  <Input
                    {...register("meta_title")}
                    placeholder="Judul SEO (default: nama produk)"
                    className={inputClass}
                  />
                </Field>
                <Field label="Meta Description" error={errors.meta_description?.message}>
                  <Textarea
                    {...register("meta_description")}
                    placeholder="Deskripsi singkat untuk mesin pencari (max 160 karakter)"
                    rows={3}
                    className={textareaClass}
                  />
                </Field>
              </div>
            </Section>
          </div>
          {/* end space-y-8 */}

          {/* ── Submit ─────────────────────────────────────────────────── */}
          <div className="flex gap-3 pt-8">
            <Button type="submit" variant="primary" loading={isPending}>
              {isEdit ? "Simpan Perubahan" : "Tambah Produk"}
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (!isEdit) sessionStorage.removeItem(DRAFT_KEY);
                router.back();
              }}
              disabled={isPending}
            >
              Batal
            </Button>
          </div>
        </div>
        {/* end kolom kanan */}
      </div>
    </form>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="admin-utility-card overflow-hidden p-0">
      <div className="admin-utility-card-header">
        <h2 className="admin-section-title">{title}</h2>
      </div>
      <div className="space-y-4 p-6">{children}</div>
    </div>
  );
}

const labelClass = "text-[11px] font-semibold text-foreground";

function Field({
  label,
  error,
  required,
  className,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className={cn(labelClass, error ? "text-destructive" : undefined)}>
        {label}
        {required ? <span className="ml-0.5 text-brand">*</span> : null}
      </Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
