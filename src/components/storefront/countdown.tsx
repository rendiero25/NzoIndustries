"use client";

import { useEffect, useState } from "react";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    h: Math.floor(s / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

/** Countdown flash sale: digit berganti dengan flip halus (§8). Server render "--". */
export function Countdown({ endsAt }: { endsAt: string }) {
  const end = new Date(endsAt).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  const p = now === null ? null : parts(end - now);
  const cells: [string, number | null][] = [
    ["jam", p?.h ?? null],
    ["menit", p?.m ?? null],
    ["detik", p?.s ?? null],
  ];

  return (
    <div className="flex items-center gap-1.5" role="timer" aria-label="Sisa waktu flash sale">
      {cells.map(([label, value], i) => (
        <span key={label} className="flex items-center gap-1.5">
          {i > 0 ? (
            <span aria-hidden className="font-bold">
              :
            </span>
          ) : null}
          <span className="flex h-10 min-w-10 items-center justify-center overflow-hidden rounded-md bg-signal px-1.5 text-lg font-bold text-brand-black tabular-nums">
            <span key={value ?? "x"} className="motion-safe:animate-tick">
              {value === null ? "--" : String(value).padStart(2, "0")}
            </span>
            <span className="sr-only"> {label}</span>
          </span>
        </span>
      ))}
    </div>
  );
}
