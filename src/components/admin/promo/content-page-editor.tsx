"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Markdown } from "@/components/shared/markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { contentPageSchema, type ContentPageValues } from "@/lib/validations/admin-promo";
import { saveContentPage } from "@/server/actions/admin/promo";
import type { AdminContentPage } from "@/server/queries/admin/promo";

const CHEATSHEET = [
  ["## Judul bagian", "Judul"],
  ["**tebal**", "Tebal"],
  ["- butir", "Daftar"],
  ["1. langkah", "Daftar bernomor"],
  ["[teks](/products)", "Link"],
  ["> catatan", "Kutipan"],
];

export function ContentPageEditor({ page }: { page: AdminContentPage }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<ContentPageValues>({
    resolver: zodResolver(contentPageSchema),
    defaultValues: {
      title: page.title,
      body: page.body,
      metaDescription: page.metaDescription ?? "",
      isPublished: page.isPublished,
    },
  });

  const body = useWatch({ control, name: "body" });
  const isPublished = useWatch({ control, name: "isPublished" });
  const meta = useWatch({ control, name: "metaDescription" }) ?? "";

  const onSubmit = (values: ContentPageValues) =>
    start(async () => {
      const res = await saveContentPage(page.slug, values);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        values.isPublished
          ? "Halaman disimpan dan tayang."
          : "Draf disimpan. Toko masih memakai teks bawaan.",
      );
      reset(values);
      router.refresh();
    });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cp-title">Judul</Label>
            <Input id="cp-title" aria-invalid={!!errors.title} {...register("title")} />
            {errors.title ? <p className="text-sm text-danger">{errors.title.message}</p> : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cp-meta">
              Deskripsi untuk mesin pencari ({String(meta).length}/170)
            </Label>
            <Textarea id="cp-meta" rows={2} {...register("metaDescription")} />
            {errors.metaDescription ? (
              <p className="text-sm text-danger">{errors.metaDescription.message}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="write">
        <TabsList>
          <TabsTrigger value="write">Tulis</TabsTrigger>
          <TabsTrigger value="preview">Pratinjau</TabsTrigger>
        </TabsList>
        <TabsContent value="write" className="flex flex-col gap-2">
          <Label htmlFor="cp-body" className="sr-only">
            Isi (Markdown)
          </Label>
          <Textarea
            id="cp-body"
            rows={22}
            className="font-mono text-sm leading-6"
            aria-invalid={!!errors.body}
            {...register("body")}
          />
          {errors.body ? <p className="text-sm text-danger">{errors.body.message}</p> : null}
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted-foreground">
            {CHEATSHEET.map(([code, label]) => (
              <span key={code}>
                <code className="rounded bg-muted px-1 font-mono">{code}</code> {label}
              </span>
            ))}
            <span>HTML dan gambar tidak dirender.</span>
          </p>
        </TabsContent>
        <TabsContent value="preview">
          <Card>
            <CardContent className="p-6">
              {body.trim() ? (
                <Markdown source={body} />
              ) : (
                <p className="text-sm text-muted-foreground">Belum ada isi.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background/95 px-1 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <Switch
            id="cp-pub"
            checked={isPublished}
            onCheckedChange={(v) => setValue("isPublished", v, { shouldDirty: true })}
          />
          <Label htmlFor="cp-pub" className="flex flex-col items-start gap-0">
            <span>Tayang</span>
            <span className="text-caption font-normal text-muted-foreground">
              Mati = toko memakai teks bawaan aplikasi.
            </span>
          </Label>
        </div>
        <Button type="submit" disabled={pending || !isDirty}>
          {pending ? "Menyimpan…" : "Simpan"}
        </Button>
      </div>
    </form>
  );
}
