"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const tableActionClass = buttonVariants({ variant: "table-action", size: "sm" });

type AdminTableEditAppearance = "brand" | "filled";

export function AdminTableEditLink({
  className,
  children = "Edit",
  appearance = "brand",
  ...props
}: ComponentProps<typeof Link> & {
  children?: ReactNode;
  /** `filled` = bg foreground seperti tombol Detail (pesanan/pelanggan) */
  appearance?: AdminTableEditAppearance;
}) {
  return (
    <Link
      className={cn(
        buttonVariants({
          variant: appearance === "filled" ? "dark" : "table-action-brand",
          size: "sm",
        }),
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}

export function AdminTableDetailLink({
  className,
  children = "Detail",
  ...props
}: ComponentProps<typeof Link> & { children?: ReactNode }) {
  return (
    <Link className={cn(tableActionClass, className)} {...props}>
      {children}
    </Link>
  );
}

export function AdminTableDeleteButton({
  className,
  children = "Hapus",
  ...props
}: ComponentProps<"button"> & { children?: ReactNode }) {
  return (
    <button
      type="button"
      className={cn(buttonVariants({ variant: "table-action-destructive", size: "sm" }), className)}
      {...props}
    >
      {children}
    </button>
  );
}

type RowTone = "brand" | "danger" | "neutral";

const rowToneVariant: Record<
  RowTone,
  "table-action-brand" | "table-action-destructive" | "table-action"
> = {
  brand: "table-action-brand",
  danger: "table-action-destructive",
  neutral: "table-action",
};

export function AdminTableRowTextButton({
  tone = "brand",
  appearance,
  className,
  ...props
}: ComponentProps<"button"> & {
  tone?: RowTone;
  /** `filled` = bg foreground seperti tombol Detail pesanan/pelanggan */
  appearance?: AdminTableEditAppearance;
}) {
  const variant = appearance === "filled" ? "dark" : rowToneVariant[tone];

  return (
    <button
      type="button"
      className={cn(buttonVariants({ variant, size: "sm" }), className)}
      {...props}
    />
  );
}
