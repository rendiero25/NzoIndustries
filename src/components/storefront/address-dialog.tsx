"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, MapPin } from "lucide-react";
import { useEffect, useId, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { ShippingArea } from "@/lib/shipping/provider";
import { cn } from "@/lib/utils";
import { addressSchema, type AddressInput, type AddressValues } from "@/lib/validations/address";
import { saveAddress, searchShippingAreas } from "@/server/actions/address";
import type { SavedAddress } from "@/server/queries/checkout";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (address: SavedAddress) => void;
  /** Isi awal saat mengubah alamat. */
  initial?: SavedAddress | null;
};

function FieldError({ message }: { message?: string }) {
  return message ? (
    <p role="alert" className="text-caption text-destructive">
      {message}
    </p>
  ) : null;
}

/** Pencarian kecamatan/kode pos (Biteship maps) dalam Popover + Command. */
function AreaPicker({
  value,
  onSelect,
  invalid,
}: {
  value: string;
  onSelect: (area: ShippingArea) => void;
  invalid: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<{ q: string; areas: ShippingArea[]; error: string | null }>({
    q: "",
    areas: [],
    error: null,
  });
  const listId = useId();

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const res = await searchShippingAreas({ query: q });
      if (cancelled) return;
      setState(res.ok ? { q, areas: res.areas, error: null } : { q, areas: [], error: res.error });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const q = query.trim();
  const searching = q.length >= 3 && state.q !== q;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          id="addr-area"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-invalid={invalid}
          className={cn(
            "h-11 w-full justify-start gap-2 font-normal",
            !value && "text-muted-foreground",
          )}
        >
          <MapPin className="size-4 shrink-0" strokeWidth={1.75} />
          <span className="truncate">{value || "Cari kecamatan atau kode pos"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Contoh: Coblong atau 40132"
          />
          <CommandList id={listId}>
            {q.length < 3 ? (
              <CommandEmpty>Ketik minimal 3 huruf.</CommandEmpty>
            ) : searching ? (
              <div className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
                <Spinner className="size-4" /> Mencari…
              </div>
            ) : state.error ? (
              <CommandEmpty>{state.error}</CommandEmpty>
            ) : (
              <>
                <CommandEmpty>Wilayah tidak ditemukan. Coba nama kecamatan lain.</CommandEmpty>
                <CommandGroup>
                  {state.areas.map((area) => (
                    <CommandItem
                      key={area.id}
                      value={area.id}
                      onSelect={() => {
                        onSelect(area);
                        setOpen(false);
                      }}
                    >
                      <span className="line-clamp-2">{area.label}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const EMPTY: AddressInput = {
  label: "",
  recipient: "",
  phone: "",
  areaId: "",
  province: "",
  city: "",
  district: "",
  postalCode: "",
  fullAddress: "",
  isDefault: false,
};

export function AddressDialog({ open, onOpenChange, onSaved, initial }: Props) {
  const [pending, startTransition] = useTransition();
  const form = useForm<AddressInput, unknown, AddressValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: EMPTY,
  });
  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    setError,
    formState: { errors },
  } = form;

  useEffect(() => {
    if (!open) return;
    reset(
      initial
        ? {
            label: initial.label ?? "",
            recipient: initial.recipient,
            phone: initial.phone,
            areaId: initial.areaId ?? "",
            province: initial.province,
            city: initial.city,
            district: initial.district,
            postalCode: initial.postalCode,
            fullAddress: initial.fullAddress,
            isDefault: initial.isDefault,
          }
        : EMPTY,
    );
  }, [open, initial, reset]);

  const [district, city, postalCode, isDefault] = useWatch({
    control,
    name: ["district", "city", "postalCode", "isDefault"],
  });
  const areaLabel = district ? `${district}, ${city} ${postalCode}` : "";

  const onSubmit = (values: AddressValues) => {
    startTransition(async () => {
      const res = await saveAddress({ ...values, id: initial?.id });
      if (!res.ok) {
        for (const [field, messages] of Object.entries(res.fieldErrors ?? {})) {
          if (messages?.[0]) setError(field as keyof AddressInput, { message: messages[0] });
        }
        toast.error(res.error);
        return;
      }
      toast.success(initial ? "Alamat diperbarui" : "Alamat disimpan");
      onSaved(res.address);
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Ubah alamat" : "Tambah alamat"}</DialogTitle>
          <DialogDescription>Alamat ini dipakai untuk menghitung ongkir.</DialogDescription>
        </DialogHeader>

        <form id="address-form" onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="addr-recipient">Nama penerima</Label>
              <Input
                id="addr-recipient"
                autoComplete="name"
                aria-invalid={!!errors.recipient}
                {...register("recipient")}
              />
              <FieldError message={errors.recipient?.message} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="addr-phone">Nomor HP</Label>
              <Input
                id="addr-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="08xxxxxxxxxx"
                aria-invalid={!!errors.phone}
                {...register("phone")}
              />
              <FieldError message={errors.phone?.message} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="addr-area">Kecamatan / kode pos</Label>
            <AreaPicker
              value={areaLabel}
              invalid={!!errors.areaId}
              onSelect={(area) => {
                const opts = { shouldValidate: true, shouldDirty: true } as const;
                setValue("areaId", area.id, opts);
                setValue("province", area.province, opts);
                setValue("city", area.city, opts);
                setValue("district", area.district, opts);
                setValue("postalCode", area.postalCode, opts);
              }}
            />
            <FieldError message={errors.areaId?.message ?? errors.postalCode?.message} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="addr-full">Alamat lengkap</Label>
            <Textarea
              id="addr-full"
              rows={3}
              autoComplete="street-address"
              placeholder="Nama jalan, nomor rumah, RT/RW, patokan"
              aria-invalid={!!errors.fullAddress}
              {...register("fullAddress")}
            />
            <FieldError message={errors.fullAddress?.message} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="addr-label">Label (opsional)</Label>
            <Input id="addr-label" placeholder="Rumah, Kantor, Bengkel" {...register("label")} />
            <FieldError message={errors.label?.message} />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={!!isDefault}
              onCheckedChange={(v) => setValue("isDefault", v === true)}
            />
            Jadikan alamat utama
          </label>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button type="submit" form="address-form" disabled={pending}>
            {pending ? <Spinner className="size-4" /> : <Check className="size-4" />}
            Simpan alamat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
