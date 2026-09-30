"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ChevronUp,
  ChevronDown,
  ImageIcon,
  Zap,
  PackageSearch,
  Star,
  LayoutGrid,
  ExternalLink,
  AlertCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusPillToggle } from "@/components/ui/status-pill-toggle";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { saveHomeSections, type HomeSection, type HomeSectionKey } from "../_actions";

// ── Types ─────────────────────────────────────────────────────────────────
type BannerItem = {
  id: string;
  title: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

type FlashSaleItem = {
  id: string;
  name: string;
  is_active: boolean;
  starts_at: string;
  ends_at: string;
  created_at: string;
  product_count: number;
};

type PromoItem = {
  id: string;
  title: string;
  is_active: boolean;
  max_items: number;
  selection_mode: "manual" | "brand";
  created_at: string;
  product_count: number;
  brand_count: number;
};

interface Props {
  banners: BannerItem[];
  flashSales: FlashSaleItem[];
  secondPromos: PromoItem[];
  featuredPromos: PromoItem[];
  initialSections: HomeSection[];
}

// ── Constants ─────────────────────────────────────────────────────────────
const GENERIC_KEYS = new Set<HomeSectionKey>(["promo_5", "promo_6", "promo_7", "promo_8"]);

const SECTION_META: Record<
  HomeSectionKey,
  {
    label: string;
    description: string;
    icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
    manageHref: string | null;
  }
> = {
  main_banner: {
    label: "Main Banner",
    description: "Bagian hero utama di atas halaman",
    icon: ImageIcon,
    manageHref: "/admin/promotions/main-banner",
  },
  flash_sale: {
    label: "Flash Sale",
    description: "Di bawah main banner",
    icon: Zap,
    manageHref: "/admin/promotions/flash-sale",
  },
  second_products: {
    label: "Produk Second",
    description: "Di bawah bagian brand",
    icon: PackageSearch,
    manageHref: "/admin/promotions/second-products",
  },
  featured_products: {
    label: "Rekomendasi Produk",
    description: "Di bawah Produk Second",
    icon: Star,
    manageHref: "/admin/promotions/featured-products",
  },
  promo_5: {
    label: "Slot Promosi 5",
    description: "Section tambahan — pilih tipe promosi bebas",
    icon: LayoutGrid,
    manageHref: null,
  },
  promo_6: {
    label: "Slot Promosi 6",
    description: "Section tambahan — pilih tipe promosi bebas",
    icon: LayoutGrid,
    manageHref: null,
  },
  promo_7: {
    label: "Slot Promosi 7",
    description: "Section tambahan — pilih tipe promosi bebas",
    icon: LayoutGrid,
    manageHref: null,
  },
  promo_8: {
    label: "Slot Promosi 8",
    description: "Section tambahan — pilih tipe promosi bebas",
    icon: LayoutGrid,
    manageHref: null,
  },
};

const CLEAR_VALUE = "__clear__";

type OptionItem = {
  value: string;
  label: string;
  sub: string;
  expired: boolean;
  upcoming: boolean;
  inactive: boolean;
};

// ── Helpers ───────────────────────────────────────────────────────────────
function isExpired(endsAt: string | null | undefined): boolean {
  return !!endsAt && new Date(endsAt) < new Date();
}

function isUpcoming(startsAt: string | null | undefined): boolean {
  return !!startsAt && new Date(startsAt) > new Date();
}

function StatusBadge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
        className,
      )}
    >
      {children}
    </span>
  );
}

function StatusDot({ tone }: { tone: "red" | "amber" | "zinc" }) {
  return (
    <span
      className={cn(
        "size-1.5 shrink-0 rounded-full",
        tone === "red" && "bg-red-500",
        tone === "amber" && "bg-amber-500",
        tone === "zinc" && "bg-zinc-400",
      )}
    />
  );
}

// ── Section card ──────────────────────────────────────────────────────────
function SectionCard({
  section,
  index,
  totalCount,
  availableOptions,
  warningBadge,
  onSelect,
  onToggle,
  onMoveUp,
  onMoveDown,
}: {
  section: HomeSection;
  index: number;
  totalCount: number;
  availableOptions:
    null | { flash: OptionItem[]; second: OptionItem[]; featured: OptionItem[] } | OptionItem[];
  warningBadge: React.ReactNode;
  onSelect: (value: string) => void;
  onToggle: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { label, description, icon: Icon, manageHref } = SECTION_META[section.key];
  const isGeneric = GENERIC_KEYS.has(section.key);

  // Typed options (flash_sale / second / featured — single flat array)
  const typedOptions =
    !isGeneric && availableOptions !== null ? (availableOptions as OptionItem[]) : null;

  // Generic options (grouped)
  const groupedOptions =
    isGeneric && availableOptions !== null
      ? (availableOptions as { flash: OptionItem[]; second: OptionItem[]; featured: OptionItem[] })
      : null;

  const hasAnyOptions = typedOptions
    ? typedOptions.length > 0
    : groupedOptions
      ? groupedOptions.flash.length +
          groupedOptions.second.length +
          groupedOptions.featured.length >
        0
      : false;

  // Flat lookup buat render ringkas nilai terpilih di trigger (beda dari ItemLabel dua baris di list)
  const flatOptions =
    typedOptions ??
    (groupedOptions
      ? [...groupedOptions.flash, ...groupedOptions.second, ...groupedOptions.featured]
      : []);
  const selectedOption = section.selected_id
    ? flatOptions.find((o) => o.value === section.selected_id)
    : undefined;

  return (
    <div
      className={cn(
        "rounded-xl border border-[#e0e0e0] bg-card",
        !section.is_active && "opacity-60",
      )}
    >
      <div className="flex items-start gap-4 p-4">
        {/* Order badge + move buttons */}
        <div className="flex shrink-0 flex-col items-center gap-1 pt-0.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-black text-muted-foreground">
            {index + 1}
          </span>
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-20"
          >
            <ChevronUp size={12} />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === totalCount - 1}
            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-20"
          >
            <ChevronDown size={12} />
          </button>
        </div>

        {/* Icon */}
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#e0e0e0] bg-muted">
          <Icon size={15} strokeWidth={1.5} className="text-foreground" />
        </div>

        {/* Content */}
        <div className="flex-1 space-y-2.5">
          <div>
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <p className="text-[11px] text-muted-foreground">{description}</p>
          </div>

          {/* Main banner: no dropdown */}
          {availableOptions === null ? (
            <div className="flex items-center gap-3">
              <span className="text-[12px] text-muted-foreground">
                Semua banner aktif tampil otomatis di carousel
              </span>
              {manageHref && (
                <Link
                  href={manageHref}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand underline-offset-2 hover:underline"
                >
                  Kelola <ExternalLink size={10} />
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Select value={section.selected_id ?? ""} onValueChange={onSelect}>
                  <SelectTrigger className="h-8 w-full max-w-sm text-sm">
                    <SelectValue placeholder="Pilih promosi...">
                      {selectedOption && (
                        <span className="flex min-w-0 items-center gap-1.5">
                          {selectedOption.expired ? (
                            <StatusDot tone="red" />
                          ) : selectedOption.upcoming ? (
                            <StatusDot tone="amber" />
                          ) : selectedOption.inactive ? (
                            <StatusDot tone="zinc" />
                          ) : null}
                          <span className="truncate">{selectedOption.label}</span>
                        </span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent position="popper" align="start" className="min-w-[320px]">
                    {/* Clear */}
                    <SelectGroup>
                      <SelectItem value={CLEAR_VALUE} className="text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <XCircle size={12} className="text-muted-foreground" />
                          Kosongkan pilihan
                        </span>
                      </SelectItem>
                    </SelectGroup>

                    {hasAnyOptions && <SelectSeparator />}

                    {/* Typed (flash / second / featured — flat) */}
                    {typedOptions && typedOptions.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Tersedia</SelectLabel>
                        {typedOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="py-2">
                            <ItemLabel opt={opt} />
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}

                    {/* Generic — grouped by type */}
                    {groupedOptions && (
                      <>
                        {groupedOptions.flash.length > 0 && (
                          <SelectGroup>
                            <SelectLabel>Flash Sale</SelectLabel>
                            {groupedOptions.flash.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value} className="py-2">
                                <ItemLabel opt={opt} />
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                        {groupedOptions.second.length > 0 && (
                          <>
                            {groupedOptions.flash.length > 0 && <SelectSeparator />}
                            <SelectGroup>
                              <SelectLabel>Produk Second</SelectLabel>
                              {groupedOptions.second.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value} className="py-2">
                                  <ItemLabel opt={opt} />
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </>
                        )}
                        {groupedOptions.featured.length > 0 && (
                          <>
                            {(groupedOptions.flash.length > 0 ||
                              groupedOptions.second.length > 0) && <SelectSeparator />}
                            <SelectGroup>
                              <SelectLabel>Rekomendasi Produk</SelectLabel>
                              {groupedOptions.featured.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value} className="py-2">
                                  <ItemLabel opt={opt} />
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </>
                        )}
                        {!hasAnyOptions && (
                          <div className="px-3 py-3 text-center text-[11px] text-muted-foreground">
                            Semua promosi sudah dipakai di seksi lain
                          </div>
                        )}
                      </>
                    )}

                    {!isGeneric && !hasAnyOptions && (
                      <div className="px-3 py-3 text-center text-[11px] text-muted-foreground">
                        Semua item sudah dipakai di seksi lain
                      </div>
                    )}
                  </SelectContent>
                </Select>

                {manageHref && (
                  <Link
                    href={manageHref}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground underline-offset-2 hover:text-brand hover:underline"
                  >
                    Kelola <ExternalLink size={10} />
                  </Link>
                )}
              </div>

              {warningBadge}
            </div>
          )}
        </div>

        {/* Active toggle */}
        <div className="shrink-0 pt-0.5">
          <StatusPillToggle
            active={section.is_active}
            onToggle={onToggle}
            activeLabel="Aktif"
            inactiveLabel="Nonaktif"
            size="compact"
          />
        </div>
      </div>
    </div>
  );
}

function ItemLabel({ opt }: { opt: OptionItem }) {
  return (
    <span className="flex flex-col gap-1">
      <span className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-foreground">
        {opt.label}
        {opt.expired && (
          <span className="rounded-full bg-red-100 px-1.5 py-px text-[9px] font-semibold text-red-700 uppercase">
            Expired
          </span>
        )}
        {opt.upcoming && (
          <span className="rounded-full bg-amber-100 px-1.5 py-px text-[9px] font-semibold text-amber-700 uppercase">
            Belum mulai
          </span>
        )}
        {opt.inactive && (
          <span className="rounded-full bg-zinc-100 px-1.5 py-px text-[9px] font-semibold text-zinc-600 uppercase">
            Nonaktif
          </span>
        )}
      </span>
      <span className="text-[10px] text-muted-foreground">{opt.sub}</span>
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export function HomeSectionsEditor({
  banners: _banners,
  flashSales,
  secondPromos,
  featuredPromos,
  initialSections,
}: Props) {
  const [sections, setSections] = useState<HomeSection[]>(initialSections);
  const [isPending, startTransition] = useTransition();

  // ── Collect ALL selected IDs (for exclusive assignment) ───────────────
  const getAllUsedIds = (excludeKey: HomeSectionKey): Set<string> =>
    new Set(
      sections.filter((s) => s.key !== excludeKey && s.selected_id).map((s) => s.selected_id!),
    );

  // ── Build dropdown options per section ────────────────────────────────
  const getOptionsForSection = (section: HomeSection) => {
    if (section.key === "main_banner") return null;

    const usedElsewhere = getAllUsedIds(section.key);

    if (section.key === "flash_sale") {
      return flashSales
        .filter((f) => f.id === section.selected_id || !usedElsewhere.has(f.id))
        .map((f) => ({
          value: f.id,
          label: f.name,
          sub: `${f.product_count} varian · ${formatDate(f.starts_at)} – ${formatDate(f.ends_at)}`,
          expired: isExpired(f.ends_at),
          upcoming: isUpcoming(f.starts_at),
          inactive: !f.is_active,
        }));
    }

    if (section.key === "second_products") {
      return secondPromos
        .filter((p) => p.id === section.selected_id || !usedElsewhere.has(p.id))
        .map((p) => ({
          value: p.id,
          label: p.title,
          sub:
            p.selection_mode === "manual"
              ? `Per Produk · ${p.product_count} produk · maks. ${p.max_items}`
              : `Per Brand · ${p.brand_count} brand · maks. ${p.max_items}`,
          expired: false,
          upcoming: false,
          inactive: !p.is_active,
        }));
    }

    if (section.key === "featured_products") {
      return featuredPromos
        .filter((p) => p.id === section.selected_id || !usedElsewhere.has(p.id))
        .map((p) => ({
          value: p.id,
          label: p.title,
          sub:
            p.selection_mode === "manual"
              ? `Per Produk · ${p.product_count} produk · maks. ${p.max_items}`
              : `Per Brand · ${p.brand_count} brand · maks. ${p.max_items}`,
          expired: false,
          upcoming: false,
          inactive: !p.is_active,
        }));
    }

    // Generic slots (promo_5…promo_8)
    if (GENERIC_KEYS.has(section.key)) {
      return {
        flash: flashSales
          .filter((f) => f.id === section.selected_id || !usedElsewhere.has(f.id))
          .map((f) => ({
            value: f.id,
            label: f.name,
            sub: `${f.product_count} varian · ${formatDate(f.starts_at)} – ${formatDate(f.ends_at)}`,
            expired: isExpired(f.ends_at),
            upcoming: isUpcoming(f.starts_at),
            inactive: !f.is_active,
          })),
        second: secondPromos
          .filter((p) => p.id === section.selected_id || !usedElsewhere.has(p.id))
          .map((p) => ({
            value: p.id,
            label: p.title,
            sub:
              p.selection_mode === "manual"
                ? `Per Produk · ${p.product_count} produk`
                : `Per Brand · ${p.brand_count} brand`,
            expired: false,
            upcoming: false,
            inactive: !p.is_active,
          })),
        featured: featuredPromos
          .filter((p) => p.id === section.selected_id || !usedElsewhere.has(p.id))
          .map((p) => ({
            value: p.id,
            label: p.title,
            sub:
              p.selection_mode === "manual"
                ? `Per Produk · ${p.product_count} produk`
                : `Per Brand · ${p.brand_count} brand`,
            expired: false,
            upcoming: false,
            inactive: !p.is_active,
          })),
      };
    }

    return [];
  };

  // ── Warning badge ─────────────────────────────────────────────────────
  const getWarningBadge = (section: HomeSection): React.ReactNode => {
    if (!section.selected_id) return null;

    // Try flash_sale (applies to flash_sale typed AND generic slots)
    const f = flashSales.find((f) => f.id === section.selected_id);
    if (f) {
      if (isExpired(f.ends_at)) {
        return (
          <StatusBadge className="bg-red-50 text-red-700">
            <AlertCircle size={10} />
            Flash sale telah expired — tidak akan tampil di beranda
          </StatusBadge>
        );
      }
      if (isUpcoming(f.starts_at)) {
        return (
          <StatusBadge className="bg-amber-50 text-amber-700">
            <Clock size={10} />
            Belum mulai — akan tampil saat {formatDate(f.starts_at)}
          </StatusBadge>
        );
      }
      if (!f.is_active) {
        return (
          <StatusBadge className="bg-zinc-100 text-zinc-600">
            <AlertCircle size={10} />
            Nonaktif — tidak akan tampil di beranda
          </StatusBadge>
        );
      }
      return null;
    }

    const promo = [...secondPromos, ...featuredPromos].find((p) => p.id === section.selected_id);
    if (promo && !promo.is_active) {
      return (
        <StatusBadge className="bg-zinc-100 text-zinc-600">
          <AlertCircle size={10} />
          Nonaktif — tidak akan tampil di beranda
        </StatusBadge>
      );
    }

    return null;
  };

  // ── Event handlers ────────────────────────────────────────────────────
  const handleSelect = (sectionKey: HomeSectionKey, value: string) => {
    const newId = value === CLEAR_VALUE || value === "" ? null : value;
    setSections((prev) =>
      prev.map((s) => (s.key === sectionKey ? { ...s, selected_id: newId } : s)),
    );
  };

  const toggleActive = (key: HomeSectionKey) => {
    setSections((prev) => prev.map((s) => (s.key === key ? { ...s, is_active: !s.is_active } : s)));
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setSections((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next.map((s, i) => ({ ...s, order: i + 1 }));
    });
  };

  const moveDown = (index: number) => {
    if (index === sections.length - 1) return;
    setSections((prev) => {
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next.map((s, i) => ({ ...s, order: i + 1 }));
    });
  };

  const handleSave = () => {
    startTransition(async () => {
      const { error } = await saveHomeSections(sections);
      if (error) toast.error(error);
      else toast.success("Tampilan beranda disimpan.");
    });
  };

  return (
    <div className="space-y-4">
      {sections.map((section, index) => (
        <SectionCard
          key={section.key}
          section={section}
          index={index}
          totalCount={sections.length}
          availableOptions={getOptionsForSection(section)}
          warningBadge={getWarningBadge(section)}
          onSelect={(val) => handleSelect(section.key, val)}
          onToggle={() => toggleActive(section.key)}
          onMoveUp={() => moveUp(index)}
          onMoveDown={() => moveDown(index)}
        />
      ))}

      <div className="pt-2">
        <Button type="button" variant="primary" size="sm" onClick={handleSave} loading={isPending}>
          Simpan Perubahan
        </Button>
      </div>
    </div>
  );
}
