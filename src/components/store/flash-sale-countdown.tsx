"use client";

import { useEffect, useState } from "react";

type Segment = { label: string; value: number };

function getRemaining(endsAt: string): { expired: boolean; segments: Segment[] } {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return { expired: true, segments: [] };
  const s = Math.floor(diff / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const segments: Segment[] = [];
  if (days > 0) segments.push({ label: "Hari", value: days });
  segments.push({ label: "Jam", value: hours });
  segments.push({ label: "Mnt", value: minutes });
  segments.push({ label: "Dtk", value: seconds });
  return { expired: false, segments };
}

export function FlashSaleCountdown({ endsAt }: { endsAt: string }) {
  const [state, setState] = useState(() => getRemaining(endsAt));

  useEffect(() => {
    const id = setInterval(() => setState(getRemaining(endsAt)), 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (state.expired) {
    return <p className="text-sm text-muted-foreground">Flash sale telah berakhir.</p>;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Berakhir dalam</span>
      <div className="flex items-center gap-1">
        {state.segments.map((seg, i) => (
          <span key={seg.label} className="flex items-center gap-1">
            {i > 0 && <span className="font-mono text-muted-foreground">:</span>}
            <span className="font-mono text-sm font-bold tabular-nums">
              {String(seg.value).padStart(2, "0")}
            </span>
            <span className="text-xs text-muted-foreground">{seg.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
