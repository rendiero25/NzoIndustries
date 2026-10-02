import {
  CheckCircle2,
  Circle,
  Home,
  MapPin,
  Package,
  PackageCheck,
  RotateCcw,
  Truck,
  UserCheck,
  XCircle,
} from "lucide-react";

import type { TrackingResult, TrackingStep } from "@/lib/biteship/fetch-tracking";

type StepCfg = { label: string; Icon: React.ElementType; color: string; bg: string };

const STEP_CFG: Record<string, StepCfg> = {
  confirmed: {
    label: "Pesanan Dikonfirmasi",
    Icon: CheckCircle2,
    color: "text-blue-500",
    bg: "bg-blue-50",
  },
  allocated: {
    label: "Kurir Dialokasikan",
    Icon: UserCheck,
    color: "text-blue-500",
    bg: "bg-blue-50",
  },
  picking_up: { label: "Penjemputan", Icon: MapPin, color: "text-amber-500", bg: "bg-amber-50" },
  picked: {
    label: "Paket Diambil",
    Icon: PackageCheck,
    color: "text-foreground",
    bg: "bg-muted",
  },
  dropping_off: {
    label: "Dalam Pengiriman",
    Icon: Truck,
    color: "text-foreground",
    bg: "bg-muted",
  },
  delivered: { label: "Paket Terkirim", Icon: Home, color: "text-green-600", bg: "bg-green-50" },
  rejected: { label: "Ditolak", Icon: XCircle, color: "text-red-500", bg: "bg-red-50" },
  cancelled: { label: "Dibatalkan", Icon: XCircle, color: "text-red-500", bg: "bg-red-50" },
  returned: { label: "Diretur", Icon: RotateCcw, color: "text-yellow-600", bg: "bg-yellow-50" },
};

const FALLBACK_CFG: StepCfg = {
  label: "Update",
  Icon: Circle,
  color: "text-muted-foreground",
  bg: "bg-muted",
};

type StepGroup = { status: string; steps: TrackingStep[] };

function groupConsecutive(steps: TrackingStep[]): StepGroup[] {
  const groups: StepGroup[] = [];
  for (const step of steps) {
    const last = groups.at(-1);
    if (last && last.status === step.status) {
      last.steps.push(step);
    } else {
      groups.push({ status: step.status, steps: [step] });
    }
  }
  return groups;
}

function fmt(iso: string | null): string | null {
  if (!iso) return null;
  return (
    new Date(iso).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    }) + " WIB"
  );
}

export function TrackingTimeline({ result }: { result: TrackingResult }) {
  if (!result.ok || result.steps.length === 0) return null;

  const steps = [...result.steps].reverse();
  const groups = groupConsecutive(steps);
  const lastGroupIdx = groups.length - 1;

  return (
    <div>
      <p className="mb-5 text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
        Riwayat Pengiriman
      </p>
      <div>
        {groups.map((group, gi) => {
          const cfg = STEP_CFG[group.status] ?? FALLBACK_CFG;
          const { Icon } = cfg;
          const isCurrent = gi === lastGroupIdx;
          const isMulti = group.steps.length > 1;

          return (
            <div key={gi} className="flex gap-3">
              {/* Left: icon + connector */}
              <div className="flex flex-col items-center">
                <div
                  className={[
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    isCurrent ? "bg-primary ring-4 ring-ring/15" : `${cfg.bg} border border-border`,
                  ].join(" ")}
                >
                  <Icon
                    className={`h-[15px] w-[15px] ${isCurrent ? "text-white" : cfg.color}`}
                    strokeWidth={2}
                  />
                </div>
                {gi < lastGroupIdx && (
                  <div
                    className="my-1 w-px flex-1 bg-steel-200"
                    style={{ minHeight: isMulti ? 8 : 24 }}
                  />
                )}
              </div>

              {/* Right: content */}
              <div className={["min-w-0 flex-1", gi < lastGroupIdx ? "pb-5" : "pb-0"].join(" ")}>
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={[
                      "text-[14px] leading-snug font-semibold tracking-tight",
                      isCurrent ? "text-foreground" : "text-foreground",
                    ].join(" ")}
                  >
                    {cfg.label}
                  </p>
                  {isCurrent && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-foreground uppercase">
                      Saat ini
                    </span>
                  )}
                </div>

                {!isMulti &&
                  (() => {
                    const s = group.steps[0];
                    const showNote = s.note && s.note !== s.description && s.description;
                    return (
                      <div className="mt-1">
                        {s.description && (
                          <p className="text-[13px] leading-relaxed text-steel-700">
                            {s.description}
                          </p>
                        )}
                        {showNote && (
                          <p className="mt-0.5 text-[12px] text-muted-foreground">{s.note}</p>
                        )}
                        {s.at && (
                          <p className="mt-1 text-[11px] font-medium text-muted-foreground tabular-nums">
                            {fmt(s.at)}
                          </p>
                        )}
                      </div>
                    );
                  })()}

                {isMulti && (
                  <div className="mt-2.5 space-y-0 border-l-2 border-border pl-3.5">
                    {group.steps.map((s, si) => {
                      const isLastSub = si === group.steps.length - 1;
                      const showNote = s.note && s.note !== s.description && s.description;
                      return (
                        <div
                          key={si}
                          className={["relative", si < group.steps.length - 1 ? "pb-3.5" : ""].join(
                            " ",
                          )}
                        >
                          <div
                            className={[
                              "absolute top-[5px] -left-[19px] h-2 w-2 rounded-full border",
                              isLastSub && isCurrent
                                ? "border-foreground bg-primary"
                                : "border-border bg-white",
                            ].join(" ")}
                          />
                          {s.description && (
                            <p
                              className={[
                                "text-[13px] leading-relaxed",
                                isLastSub && isCurrent
                                  ? "font-medium text-foreground"
                                  : "text-steel-700",
                              ].join(" ")}
                            >
                              {s.description}
                            </p>
                          )}
                          {showNote && (
                            <p className="mt-0.5 text-[12px] text-muted-foreground">{s.note}</p>
                          )}
                          {s.at && (
                            <p className="mt-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
                              {fmt(s.at)}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { STEP_CFG, FALLBACK_CFG };

interface ShipmentHeaderProps {
  courierName?: string | null;
  courierCompany?: string | null;
  courierService?: string | null;
  awb: string;
  externalLink?: string | null;
  status: string;
  updatedAt?: string | null;
}

const SHIPMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu Konfirmasi",
  confirmed: "Pesanan Dikonfirmasi",
  allocated: "Kurir Dialokasikan",
  picking_up: "Penjemputan",
  picked: "Paket Diambil",
  dropping_off: "Dalam Pengiriman",
  delivered: "Paket Terkirim",
  rejected: "Ditolak",
  cancelled: "Dibatalkan",
  returned: "Diretur",
};

export function ShipmentTrackingCard({
  courierName,
  courierCompany,
  courierService,
  awb,
  externalLink,
  status,
  updatedAt,
  trackingResult,
}: ShipmentHeaderProps & { trackingResult: TrackingResult }) {
  const hasSteps = trackingResult.ok && trackingResult.steps.length > 0;
  const cfg = STEP_CFG[status];

  function fmtDate(iso: string | null): string | null {
    if (!iso) return null;
    return (
      new Date(iso).toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Jakarta",
      }) + " WIB"
    );
  }

  return (
    <div>
      {/* Courier + AWB header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Truck className="h-4 w-4 text-foreground" />
          </div>
          <div>
            <p className="text-[14px] leading-snug font-semibold text-foreground">
              {courierName ?? courierCompany?.toUpperCase()}
              {courierService ? ` · ${courierService}` : ""}
            </p>
            <p className="mt-0.5 font-mono text-[12px] text-muted-foreground select-all">{awb}</p>
          </div>
        </div>
      </div>

      {/* Status badge */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={[
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold",
            cfg ? `${cfg.bg} ${cfg.color}` : "bg-muted text-steel-700",
          ].join(" ")}
        >
          {cfg &&
            (() => {
              const { Icon: StatusIcon } = cfg;
              return <StatusIcon className="h-3 w-3" strokeWidth={2.5} />;
            })()}
          {SHIPMENT_STATUS_LABEL[status] ?? status}
        </span>
        {updatedAt && (
          <span className="text-[12px] text-muted-foreground">· {fmtDate(updatedAt)}</span>
        )}
      </div>

      {/* Timeline */}
      {hasSteps ? (
        <div className="mt-4 rounded-xl border border-border bg-muted p-4 sm:p-5">
          <TrackingTimeline result={trackingResult} />
        </div>
      ) : (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-muted px-4 py-3">
          <Package className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            Riwayat dari kurir belum tersedia. Coba cek langsung di website kurir.
          </p>
        </div>
      )}
    </div>
  );
}
