"use client";

import { useEffect, useState } from "react";

function getRemainingSecs(expiryTime: string): number {
  return Math.max(0, Math.floor((new Date(expiryTime).getTime() - Date.now()) / 1000));
}

function formatCountdown(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) {
    return `${h}j ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}d`;
  }
  return `${m}m ${String(s).padStart(2, "0")}d`;
}

export function PaymentCountdown({ expiryTime }: { expiryTime: string }) {
  const [secs, setSecs] = useState(() => getRemainingSecs(expiryTime));

  useEffect(() => {
    const tick = () => setSecs(getRemainingSecs(expiryTime));
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiryTime]);

  if (secs <= 0) {
    return <span className="font-mono text-[11px] font-semibold text-red-600">Kedaluwarsa</span>;
  }

  const isUrgent = secs < 30 * 60;
  return (
    <span
      className={`font-mono text-[11px] font-semibold tabular-nums ${
        isUrgent ? "text-red-600" : "text-foreground"
      }`}
    >
      {formatCountdown(secs)}
    </span>
  );
}
