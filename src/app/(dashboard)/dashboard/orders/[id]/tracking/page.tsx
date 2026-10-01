export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import {
  CheckCircle2,
  Circle,
  Home,
  Info,
  MapPin,
  Package,
  PackageCheck,
  RotateCcw,
  Truck,
  UserCheck,
  XCircle,
} from "lucide-react";

import { createClient } from "@/lib/supabase/legacy/server";
import { fetchOrderDetailForUser } from "@/lib/data/dashboard-user";
import {
  fetchBiteshipTracking,
  trackingStepsFromHistory,
  type TrackingResult,
  type TrackingStep,
} from "@/lib/biteship/fetch-tracking";
import { OrderStatusStepper } from "@/components/dashboard/order-status-stepper";
import type { Database } from "@/types/legacy-supabase";

type ShipmentStatus = Database["public"]["Enums"]["shipment_status"];

// ─── Status config ─────────────────────────────────────────────────────────

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
    color: "text-[#EA5329]",
    bg: "bg-[#FFF0E8]",
  },
  dropping_off: {
    label: "Dalam Pengiriman",
    Icon: Truck,
    color: "text-[#EA5329]",
    bg: "bg-[#FFF0E8]",
  },
  delivered: { label: "Paket Terkirim", Icon: Home, color: "text-green-600", bg: "bg-green-50" },
  rejected: { label: "Ditolak", Icon: XCircle, color: "text-red-500", bg: "bg-red-50" },
  cancelled: { label: "Dibatalkan", Icon: XCircle, color: "text-red-500", bg: "bg-red-50" },
  returned: { label: "Diretur", Icon: RotateCcw, color: "text-yellow-600", bg: "bg-yellow-50" },
};

const FALLBACK_CFG: StepCfg = {
  label: "Update",
  Icon: Circle,
  color: "text-[#a0a0a0]",
  bg: "bg-[#f5f5f7]",
};

// ─── Grouping ──────────────────────────────────────────────────────────────

type StepGroup = {
  status: string;
  steps: TrackingStep[];
};

/** Group consecutive steps with the same status into a single phase entry. */
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

// ─── Date formatter ────────────────────────────────────────────────────────

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

// ─── TrackingTimeline ──────────────────────────────────────────────────────

function TrackingTimeline({ result }: { result: TrackingResult }) {
  if (!result.ok || result.steps.length === 0) return null;

  // Biteship returns newest-first → reverse to chronological (oldest → newest, top → bottom)
  const steps = [...result.steps].reverse();
  const groups = groupConsecutive(steps);
  const lastGroupIdx = groups.length - 1;

  return (
    <div>
      <p className="mb-5 text-[11px] font-bold tracking-widest text-[#a0a0a0] uppercase">
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
              {/* ── Left: Icon + connector ── */}
              <div className="flex flex-col items-center">
                <div
                  className={[
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    isCurrent
                      ? "bg-[#EA5329] ring-4 ring-[#EA5329]/15"
                      : `${cfg.bg} border border-[#e0e0e0]`,
                  ].join(" ")}
                >
                  <Icon
                    className={`h-[15px] w-[15px] ${isCurrent ? "text-white" : cfg.color}`}
                    strokeWidth={2}
                  />
                </div>
                {gi < lastGroupIdx && (
                  <div
                    className="my-1 w-px flex-1 bg-[#e0e0e0]"
                    style={{ minHeight: isMulti ? 8 : 24 }}
                  />
                )}
              </div>

              {/* ── Right: Content ── */}
              <div className={["min-w-0 flex-1", gi < lastGroupIdx ? "pb-5" : "pb-0"].join(" ")}>
                {/* Phase header */}
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={[
                      "text-[14px] leading-snug font-semibold tracking-tight",
                      isCurrent ? "text-[#EA5329]" : "text-[#1d1d1f]",
                    ].join(" ")}
                  >
                    {cfg.label}
                  </p>
                  {isCurrent && (
                    <span className="rounded-full bg-[#EA5329]/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#EA5329] uppercase">
                      Saat ini
                    </span>
                  )}
                </div>

                {/* ── Single step ── */}
                {!isMulti &&
                  (() => {
                    const s = group.steps[0];
                    const showNote = s.note && s.note !== s.description && s.description;
                    return (
                      <div className="mt-1">
                        {s.description && (
                          <p className="text-[13px] leading-relaxed text-[#5c5c5c]">
                            {s.description}
                          </p>
                        )}
                        {showNote && <p className="mt-0.5 text-[12px] text-[#a0a0a0]">{s.note}</p>}
                        {s.at && (
                          <p className="mt-1 text-[11px] font-medium text-[#b0b0b0] tabular-nums">
                            {fmt(s.at)}
                          </p>
                        )}
                      </div>
                    );
                  })()}

                {/* ── Multi-step: recursive sub-steps ── */}
                {isMulti && (
                  <div className="mt-2.5 space-y-0 border-l-2 border-[#ececec] pl-3.5">
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
                          {/* Sub-step dot */}
                          <div
                            className={[
                              "absolute top-[5px] -left-[19px] h-2 w-2 rounded-full border",
                              isLastSub && isCurrent
                                ? "border-[#EA5329] bg-[#EA5329]"
                                : "border-[#d0d0d0] bg-white",
                            ].join(" ")}
                          />
                          {/* Content */}
                          {s.description && (
                            <p
                              className={[
                                "text-[13px] leading-relaxed",
                                isLastSub && isCurrent
                                  ? "font-medium text-[#1d1d1f]"
                                  : "text-[#5c5c5c]",
                              ].join(" ")}
                            >
                              {s.description}
                            </p>
                          )}
                          {showNote && (
                            <p className="mt-0.5 text-[12px] text-[#a0a0a0]">{s.note}</p>
                          )}
                          {s.at && (
                            <p className="mt-0.5 text-[11px] font-medium text-[#b0b0b0] tabular-nums">
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

// ─── Shipment status label ─────────────────────────────────────────────────

const SHIPMENT_STATUS_LABEL: Record<ShipmentStatus, string> = {
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

// ─── Page ──────────────────────────────────────────────────────────────────

export default async function OrderTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirectTo=/dashboard/orders/${id}/tracking`);

  const detail = await fetchOrderDetailForUser(user.id, id);
  if (!detail) notFound();

  const { order, shipments, statusHistory } = detail;
  const shipmentsWithAwb = shipments.filter((s) => s.awb);

  const trackingResults = await Promise.all(
    shipmentsWithAwb.map(async (s): Promise<TrackingResult> => {
      // Primary: timeline dari DB (diisi webhook Biteship) — selalu tersedia,
      // jalan juga utk kurir instant (gojek/grab) & test mode.
      const dbSteps = trackingStepsFromHistory(s.tracking_history);
      if (dbSteps.length > 0) {
        return {
          ok: true,
          waybillId: s.awb!,
          status: dbSteps[0]?.status ?? "",
          steps: dbSteps,
          link: null,
        };
      }
      // Fallback: tracking live by-waybill (kurir reguler di produksi).
      return fetchBiteshipTracking(s.awb!, s.courier_company ?? "");
    }),
  );

  const deliveredAt = order.delivered_at ? new Date(order.delivered_at) : null;
  const deadlineMs = deliveredAt ? deliveredAt.getTime() + 3 * 24 * 60 * 60 * 1000 : null;
  const canComplain =
    order.status === "delivered" && deadlineMs !== null && Date.now() < deadlineMs;
  const hoursLeft = deadlineMs
    ? Math.max(0, Math.ceil((deadlineMs - Date.now()) / (1000 * 60 * 60)))
    : 0;

  return (
    <>
      {canComplain && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-[13px] leading-relaxed text-amber-900">
            Ada masalah dengan pesanan? Anda memiliki{" "}
            <span className="font-semibold">{hoursLeft} jam</span> lagi untuk{" "}
            <a
              href={`/dashboard/orders/${order.id}/complaint`}
              className="underline underline-offset-2"
            >
              mengajukan komplain
            </a>
            .
          </p>
        </div>
      )}
      {order.status === "completed" && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#e0e0e0] bg-[#f5f5f7] px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#a0a0a0]" />
          <p className="text-[13px] text-[#7a7a7a]">
            Batas waktu komplain untuk pesanan ini telah berakhir.
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        {/* ── Status Pesanan ── */}
        <div className="rounded-[18px] border border-[#e0e0e0] bg-white p-5 sm:p-6">
          <p className="mb-5 text-[11px] font-bold tracking-widest text-[#a0a0a0] uppercase">
            Status Pesanan
          </p>
          <OrderStatusStepper currentStatus={order.status} statusHistory={statusHistory} />
        </div>

        {/* ── Lacak Kiriman ── */}
        <div className="rounded-[18px] border border-[#e0e0e0] bg-white p-5 sm:p-6">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF0E8]">
              <Package className="h-5 w-5 text-[#EA5329]" />
            </div>
            <div>
              <h2 className="text-[17px] leading-snug font-semibold tracking-tight text-[#1d1d1f]">
                Lacak Kiriman
              </h2>
              <p className="mt-0.5 text-[13px] text-[#7a7a7a]">Pesanan {order.order_number}</p>
            </div>
          </div>

          {shipmentsWithAwb.length === 0 ? (
            <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-[#f5f5f7] px-4 py-3.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#a0a0a0]" />
              <p className="text-[13px] leading-relaxed text-[#7a7a7a]">
                Nomor resi belum tersedia — tim kami akan memperbarui setelah paket dikirim.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-8">
              {shipmentsWithAwb.map((s, i) => {
                const tracking = trackingResults[i];
                const hasSteps = tracking?.ok && tracking.steps.length > 0;
                const externalLink = tracking?.ok ? tracking.link : null;
                const dbStatus = s.status as ShipmentStatus;

                return (
                  <div key={s.id}>
                    {/* Courier + AWB header */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FFF0E8]">
                          <Truck className="h-4 w-4 text-[#EA5329]" />
                        </div>
                        <div>
                          <p className="text-[14px] leading-snug font-semibold text-[#1d1d1f]">
                            {s.courier_name ?? s.courier_company?.toUpperCase()}
                            {s.courier_service ? ` · ${s.courier_service}` : ""}
                          </p>
                          <p className="mt-0.5 font-mono text-[12px] text-[#7a7a7a] select-all">
                            {s.awb}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Current status badge */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span
                        className={[
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold",
                          STEP_CFG[dbStatus]
                            ? `${STEP_CFG[dbStatus].bg} ${STEP_CFG[dbStatus].color}`
                            : "bg-[#f5f5f7] text-[#5c5c5c]",
                        ].join(" ")}
                      >
                        {(() => {
                          const cfg = STEP_CFG[dbStatus];
                          if (cfg) {
                            const { Icon: StatusIcon } = cfg;
                            return <StatusIcon className="h-3 w-3" strokeWidth={2.5} />;
                          }
                          return null;
                        })()}
                        {SHIPMENT_STATUS_LABEL[dbStatus] ?? dbStatus}
                      </span>
                      {s.updated_at && (
                        <span className="text-[12px] text-[#a0a0a0]">· {fmt(s.updated_at)}</span>
                      )}
                    </div>

                    {/* Timeline */}
                    {hasSteps ? (
                      <div className="mt-4 rounded-xl border border-[#e8e8e8] bg-[#fafafa] p-4 sm:p-5">
                        <TrackingTimeline result={tracking} />
                      </div>
                    ) : (
                      <div className="mt-3 flex items-start gap-2 rounded-xl bg-[#f5f5f7] px-4 py-3">
                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#b0b0b0]" />
                        <p className="text-[12px] leading-relaxed text-[#a0a0a0]">
                          Riwayat dari kurir belum tersedia. Coba cek langsung di website kurir.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
