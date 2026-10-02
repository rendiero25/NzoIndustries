"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";

export type BiteshipArea = {
  id: string;
  name: string;
  administrative_division_level_1_name: string;
  administrative_division_level_2_name: string;
  administrative_division_level_3_name: string;
  postal_code: string;
};

type Props = {
  onSelect: (area: BiteshipArea) => void;
  placeholder?: string;
};

export function AreaAutocomplete({
  onSelect,
  placeholder = "Cari kelurahan, kecamatan, atau kota…",
}: Props) {
  const [query, setQuery] = useState("");
  const [areas, setAreas] = useState<BiteshipArea[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setAreas([]);
      setOpen(false);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/shipping/areas?q=${encodeURIComponent(query)}`);
        const json = (await res.json()) as { success: boolean; areas?: BiteshipArea[] };
        setAreas(json.areas ?? []);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="h-11 w-full rounded-lg border border-border bg-white pr-9 pl-9 text-sm text-foreground outline-none focus:border-foreground focus:ring-2 focus:ring-ring/20"
        />
        {loading && (
          <Loader2 className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && areas.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-white py-1 shadow-lg">
          {areas.map((area) => (
            <li key={area.id}>
              <button
                type="button"
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted active:bg-steel-200"
                onClick={() => {
                  onSelect(area);
                  setQuery(`${area.name}, ${area.administrative_division_level_2_name}`);
                  setOpen(false);
                }}
              >
                <span className="font-medium text-foreground">{area.name}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {[
                    area.administrative_division_level_3_name,
                    area.administrative_division_level_2_name,
                    area.administrative_division_level_1_name,
                    area.postal_code,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && !loading && areas.length === 0 && query.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-white px-4 py-3 text-sm text-muted-foreground shadow-lg">
          Area tidak ditemukan.
        </div>
      )}
    </div>
  );
}
