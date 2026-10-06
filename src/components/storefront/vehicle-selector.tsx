"use client";

import { Bike, Car, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { modelYears } from "@/lib/vehicle-cookie";
import { clearActiveVehicle, setActiveVehicle } from "@/server/actions/vehicle";

export type SelectorMake = { id: string; slug: string; name: string; type: "motorcycle" | "car" };
export type SelectorModel = {
  id: string;
  makeId: string;
  name: string;
  type: "motorcycle" | "car";
  yearStart: number;
  yearEnd: number | null;
};
export type SelectorActive = { modelId: string; year: number; label: string } | null;

type Props = {
  makes: SelectorMake[];
  models: SelectorModel[];
  active: SelectorActive;
  /** `hero`: latar hitam, tombol "Cari part". `compact`: popover/PDP. */
  variant?: "hero" | "compact";
  /** Setelah tersimpan: pindah ke URL ini (hero = /products?fit=1). */
  redirectTo?: string;
  onSaved?: (label: string) => void;
  className?: string;
};

/**
 * Pemilih kendaraan bertahap: jenis → merek → model → tahun (design-system §5, §8).
 * Langkah berikutnya aktif setelah langkah sebelumnya dipilih.
 */
export function VehicleSelector({
  makes,
  models,
  active,
  variant = "compact",
  redirectTo,
  onSaved,
  className,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const activeModel = active ? models.find((m) => m.id === active.modelId) : undefined;

  const [type, setType] = useState<"motorcycle" | "car">(activeModel?.type ?? "motorcycle");
  const [makeId, setMakeId] = useState<string>(activeModel?.makeId ?? "");
  const [modelId, setModelId] = useState<string>(activeModel?.id ?? "");
  const [year, setYear] = useState<string>(active ? String(active.year) : "");

  const typeMakes = useMemo(() => makes.filter((m) => m.type === type), [makes, type]);
  const makeModels = useMemo(() => models.filter((m) => m.makeId === makeId), [models, makeId]);
  const model = makeModels.find((m) => m.id === modelId);
  const years = useMemo(() => (model ? modelYears(model.yearStart, model.yearEnd) : []), [model]);

  const hero = variant === "hero";
  const triggerClass = cn(
    "h-12 w-full min-w-0 rounded-md text-[0.9375rem] data-[size=default]:h-12",
    hero
      ? "border-steel-700 bg-asphalt text-white data-placeholder:text-steel-200 disabled:opacity-40 [&_svg]:text-steel-200"
      : "bg-background",
  );

  function submit() {
    if (!modelId || !year) {
      toast.error("Pilih merek, model, dan tahun kendaraan.");
      return;
    }
    startTransition(async () => {
      const result = await setActiveVehicle({ modelId, year: Number(year) });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Garasi: ${result.label}`);
      onSaved?.(result.label);
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    });
  }

  function clear() {
    startTransition(async () => {
      await clearActiveVehicle();
      setMakeId("");
      setModelId("");
      setYear("");
      toast.success("Kendaraan dilepas dari pencarian.");
      onSaved?.("");
      router.refresh();
    });
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <ToggleGroup
        type="single"
        value={type}
        onValueChange={(v) => {
          if (!v) return;
          setType(v as "motorcycle" | "car");
          setMakeId("");
          setModelId("");
          setYear("");
        }}
        aria-label="Jenis kendaraan"
        className={cn(
          "w-fit",
          hero &&
            "[&_button]:text-steel-200 [&_button[data-state=on]]:bg-white [&_button[data-state=on]]:text-brand-black",
        )}
        variant="outline"
      >
        <ToggleGroupItem value="motorcycle" className={cn(hero && "border-steel-700")}>
          <Bike strokeWidth={1.75} aria-hidden />
          Motor
        </ToggleGroupItem>
        <ToggleGroupItem value="car" className={cn(hero && "border-steel-700")}>
          <Car strokeWidth={1.75} aria-hidden />
          Mobil
        </ToggleGroupItem>
      </ToggleGroup>

      <div
        className={cn(
          "grid gap-2",
          hero ? "md:grid-cols-[1fr_1.4fr_0.8fr_auto]" : "sm:grid-cols-3",
        )}
      >
        <Select
          value={makeId}
          onValueChange={(v) => {
            setMakeId(v);
            setModelId("");
            setYear("");
          }}
        >
          <SelectTrigger className={triggerClass} aria-label="Merek">
            <SelectValue placeholder="Merek" />
          </SelectTrigger>
          <SelectContent>
            {typeMakes.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={modelId}
          onValueChange={(v) => {
            setModelId(v);
            setYear("");
          }}
          disabled={!makeId}
        >
          <SelectTrigger
            className={cn(triggerClass, "transition-opacity duration-200")}
            aria-label="Model"
          >
            <SelectValue placeholder="Model" />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            {makeModels.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={year} onValueChange={setYear} disabled={!modelId}>
          <SelectTrigger
            className={cn(triggerClass, "transition-opacity duration-200")}
            aria-label="Tahun"
          >
            <SelectValue placeholder="Tahun" />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hero ? (
          <Button
            type="button"
            variant="signal"
            size="lg"
            className="h-12"
            loading={pending}
            onClick={submit}
          >
            <Search aria-hidden />
            Cari part
          </Button>
        ) : null}
      </div>

      {!hero ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={submit} loading={pending} disabled={!year}>
            Simpan kendaraan
          </Button>
          {active ? (
            <Button type="button" variant="ghost" onClick={clear} disabled={pending}>
              <X aria-hidden />
              Lepas kendaraan
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
