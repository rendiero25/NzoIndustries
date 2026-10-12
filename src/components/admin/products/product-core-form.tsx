"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/import/slug";
import {
  productCoreSchema,
  type ProductCoreInput,
  type ProductCoreValues,
} from "@/lib/validations/admin-product";
import { saveProduct } from "@/server/actions/admin/products";

type Option = { id: string; name: string; depth?: number };

function FieldError({ message }: { message?: string }) {
  return message ? (
    <p role="alert" className="text-caption text-destructive">
      {message}
    </p>
  ) : null;
}

const selectClass =
  "h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/** Data utama produk: umum, harga, deskripsi, pengiriman, SEO. */
export function ProductCoreForm({
  productId,
  defaults,
  brands,
  categories,
  stock,
}: {
  productId?: string;
  defaults: ProductCoreInput;
  brands: Option[];
  categories: Option[];
  stock?: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const form = useForm<ProductCoreInput, unknown, ProductCoreValues>({
    resolver: zodResolver(productCoreSchema),
    defaultValues: defaults,
  });
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors, isDirty },
  } = form;
  const [metaTitle, metaDescription] = useWatch({
    control,
    name: ["metaTitle", "metaDescription"],
  });

  const onSubmit = (values: ProductCoreValues) =>
    start(async () => {
      const res = await saveProduct({ ...values, id: productId });
      if (!res.ok) {
        for (const [k, v] of Object.entries(res.fieldErrors ?? {})) {
          if (v?.[0]) setError(k as keyof ProductCoreInput, { message: v[0] });
        }
        toast.error(res.error);
        return;
      }
      toast.success(productId ? "Produk disimpan" : "Produk dibuat");
      if (!productId) router.push(`/admin/products/${res.id}`);
      else {
        form.reset(values as unknown as ProductCoreInput);
        router.refresh();
      }
    });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Umum</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="p-name">Nama produk</Label>
            <Input
              id="p-name"
              aria-invalid={!!errors.name}
              {...register("name", {
                onBlur: (e) => {
                  if (!productId && !form.getValues("slug"))
                    setValue("slug", slugify(e.target.value));
                },
              })}
            />
            <FieldError message={errors.name?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="p-slug">Slug URL</Label>
            <Input id="p-slug" aria-invalid={!!errors.slug} {...register("slug")} />
            <FieldError message={errors.slug?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="p-sku">SKU</Label>
            <Input
              id="p-sku"
              className="font-mono"
              aria-invalid={!!errors.sku}
              {...register("sku")}
            />
            <FieldError message={errors.sku?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="p-status">Status</Label>
            <select id="p-status" className={selectClass} {...register("status")}>
              <option value="draft">Draft (tidak tampil)</option>
              <option value="published">Tayang</option>
              <option value="archived">Arsip</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="p-brand">Brand</Label>
            <Controller
              control={control}
              name="brandId"
              render={({ field }) => (
                <select
                  id="p-brand"
                  className={selectClass}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                >
                  <option value="">Tanpa brand</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              )}
            />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label>Kategori (bisa lebih dari satu)</Label>
            <Controller
              control={control}
              name="categoryIds"
              render={({ field }) => (
                <ScrollArea className="h-48 rounded-lg border border-border p-2">
                  <ul className="flex flex-col gap-1">
                    {categories.map((c) => {
                      const checked = (field.value ?? []).includes(c.id);
                      return (
                        <li key={c.id} style={{ paddingLeft: `${(c.depth ?? 0) * 16}px` }}>
                          <label className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) =>
                                field.onChange(
                                  v
                                    ? [...(field.value ?? []), c.id]
                                    : (field.value ?? []).filter((x) => x !== c.id),
                                )
                              }
                            />
                            {c.name}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </ScrollArea>
              )}
            />
            <FieldError message={errors.categoryIds?.message} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Harga & stok</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="p-price">Harga jual (Rp)</Label>
            <Input
              id="p-price"
              type="number"
              inputMode="numeric"
              min={0}
              aria-invalid={!!errors.price}
              {...register("price")}
            />
            <FieldError message={errors.price?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="p-compare">Harga coret (opsional)</Label>
            <Input
              id="p-compare"
              type="number"
              inputMode="numeric"
              min={0}
              aria-invalid={!!errors.compareAtPrice}
              {...register("compareAtPrice")}
            />
            <FieldError message={errors.compareAtPrice?.message} />
          </div>
          {productId ? (
            <div className="grid gap-2">
              <Label>Stok</Label>
              <p className="flex h-10 items-center text-sm">
                <span className="font-semibold tabular-nums">{stock ?? 0}</span>
                <a href={`/admin/stock?q=${productId}`} className="ml-2 text-caption underline">
                  Ubah lewat penyesuaian stok
                </a>
              </p>
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="p-stock">Stok awal</Label>
              <Input
                id="p-stock"
                type="number"
                inputMode="numeric"
                min={0}
                {...register("initialStock")}
              />
              <span className="text-caption text-muted-foreground">
                Produk bervarian: isi stok per varian setelah disimpan.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deskripsi</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="p-short">Ringkasan singkat</Label>
            <Textarea id="p-short" rows={2} maxLength={300} {...register("shortDescription")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="p-desc">Deskripsi lengkap</Label>
            <Textarea id="p-desc" rows={8} {...register("description")} />
          </div>
          <div className="grid gap-2 md:grid-cols-2 md:gap-4">
            <div className="grid gap-2">
              <Label htmlFor="p-install">Cara pasang</Label>
              <Textarea id="p-install" rows={5} {...register("installationGuide")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-warranty">Info garansi</Label>
              <Textarea id="p-warranty" rows={5} maxLength={1000} {...register("warrantyInfo")} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pengiriman</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-4">
          {(
            [
              ["weightGrams", "Berat (gram)"],
              ["lengthMm", "Panjang (mm)"],
              ["widthMm", "Lebar (mm)"],
              ["heightMm", "Tinggi (mm)"],
            ] as const
          ).map(([name, label]) => (
            <div key={name} className="grid gap-2">
              <Label htmlFor={`p-${name}`}>{label}</Label>
              <Input
                id={`p-${name}`}
                type="number"
                inputMode="numeric"
                min={1}
                aria-invalid={!!errors[name]}
                {...register(name)}
              />
              <FieldError message={errors[name]?.message} />
            </div>
          ))}
          <p className="text-caption text-muted-foreground sm:col-span-4">
            Ongkir memakai berat terbesar antara berat aktual dan volumetrik (p×l×t/6000). Kosong =
            1 kg.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">SEO</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="p-meta-title">Judul halaman ({(metaTitle ?? "").length}/70)</Label>
            <Input
              id="p-meta-title"
              maxLength={70}
              {...register("metaTitle")}
              placeholder="Kosong = nama produk"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="p-meta-desc">
              Deskripsi meta ({(metaDescription ?? "").length}/170)
            </Label>
            <Textarea id="p-meta-desc" rows={2} maxLength={170} {...register("metaDescription")} />
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-0 z-10 -mx-1 flex justify-end gap-2 border-t border-border bg-background/95 px-1 py-3 backdrop-blur">
        <Button type="submit" disabled={pending || (!!productId && !isDirty)}>
          {pending ? <Spinner className="size-4" /> : null}
          {productId ? "Simpan perubahan" : "Buat produk"}
        </Button>
      </div>
    </form>
  );
}
