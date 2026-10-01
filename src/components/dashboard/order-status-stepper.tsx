import { formatDate } from "@/lib/format";
import type { OrderStatusHistoryItem } from "@/lib/data/dashboard-user";
import type { Database } from "@/types/legacy-supabase";

type OrderStatus = Database["public"]["Enums"]["order_status"];

type StepDef = {
  status: OrderStatus;
  label: string;
  description: string;
};

const NORMAL_STEPS: StepDef[] = [
  {
    status: "pending_payment",
    label: "Menunggu Pembayaran",
    description: "Pesanan dibuat, menunggu konfirmasi pembayaran.",
  },
  {
    status: "paid",
    label: "Pembayaran Dikonfirmasi",
    description: "Pembayaran berhasil diterima.",
  },
  {
    status: "processing",
    label: "Pesanan Diproses",
    description: "Toko sedang menyiapkan paketmu.",
  },
  { status: "shipped", label: "Paket Dikirim", description: "Paket sudah diserahkan ke kurir." },
  { status: "delivered", label: "Paket Tiba", description: "Paket telah sampai di tujuan." },
  {
    status: "completed",
    label: "Pesanan Selesai",
    description: "Transaksi selesai. Terima kasih!",
  },
];

const NORMAL_ORDER: OrderStatus[] = NORMAL_STEPS.map((s) => s.status);

const TERMINAL_STEPS: Partial<Record<OrderStatus, { label: string; description: string }>> = {
  cancelled: { label: "Pesanan Dibatalkan", description: "Pesanan ini telah dibatalkan." },
  refunded: { label: "Dana Dikembalikan", description: "Pesanan direfund dan dana dikembalikan." },
};

type StepState = "done" | "active" | "pending" | "terminal-bad";

interface OrderStatusStepperProps {
  currentStatus: OrderStatus;
  statusHistory: OrderStatusHistoryItem[];
}

export function OrderStatusStepper({ currentStatus, statusHistory }: OrderStatusStepperProps) {
  const isTerminal = currentStatus === "cancelled" || currentStatus === "refunded";
  const currentIdx = NORMAL_ORDER.indexOf(isTerminal ? "pending_payment" : currentStatus);

  // Find the last normal step reached before terminal state
  const lastNormalIdx = isTerminal
    ? NORMAL_ORDER.reduce((acc, s, i) => {
        return statusHistory.some((h) => h.status === s) ? i : acc;
      }, -1)
    : currentIdx;

  const getTimestamp = (status: string) => {
    const entry = statusHistory.find((h) => h.status === status);
    return entry?.created_at ?? null;
  };

  const steps = NORMAL_STEPS.map(
    (step, i): { step: StepDef; state: StepState; timestamp: string | null } => {
      let state: StepState;
      if (isTerminal) {
        state = i <= lastNormalIdx ? "done" : "pending";
      } else if (i < currentIdx) {
        state = "done";
      } else if (i === currentIdx) {
        state = "active";
      } else {
        state = "pending";
      }
      return { step, state, timestamp: getTimestamp(step.status) };
    },
  );

  const terminal = isTerminal ? TERMINAL_STEPS[currentStatus] : null;
  const terminalTimestamp = isTerminal ? getTimestamp(currentStatus) : null;

  const allItems = [
    ...steps,
    ...(terminal
      ? [
          {
            step: {
              status: currentStatus,
              label: terminal.label,
              description: terminal.description,
            } as StepDef,
            state: "terminal-bad" as StepState,
            timestamp: terminalTimestamp,
          },
        ]
      : []),
  ];

  return (
    <div>
      {allItems.map(({ step, state, timestamp }, i) => {
        const isLast = i === allItems.length - 1;
        return (
          <div key={step.status} className="flex gap-4">
            {/* dot + connector */}
            <div className="flex flex-col items-center">
              <div
                className={[
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                  state === "done" ? "bg-[#EA5329]" : "",
                  state === "active" ? "bg-[#EA5329] ring-4 ring-[#EA5329]/20" : "",
                  state === "pending" ? "border border-[#d0d0d0] bg-white" : "",
                  state === "terminal-bad" ? "bg-red-500" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {state === "done" && (
                  <svg
                    className="h-2.5 w-2.5 text-white"
                    fill="none"
                    viewBox="0 0 12 10"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M1 5l3.5 3.5L11 1" />
                  </svg>
                )}
                {state === "active" && <div className="h-2 w-2 rounded-full bg-white" />}
                {state === "terminal-bad" && <div className="h-2 w-2 rounded-full bg-white" />}
              </div>
              {!isLast && (
                <div
                  className={[
                    "my-1 w-px flex-1",
                    state === "done" ? "bg-[#EA5329]/30" : "bg-[#e0e0e0]",
                  ].join(" ")}
                  style={{ minHeight: 24 }}
                />
              )}
            </div>

            {/* content */}
            <div className={["min-w-0", isLast ? "pb-0" : "pb-5"].join(" ")}>
              <p
                className={[
                  "text-sm leading-snug font-semibold tracking-[-0.224px]",
                  state === "done" ? "text-[#1d1d1f]" : "",
                  state === "active" ? "text-[#EA5329]" : "",
                  state === "pending" ? "font-normal text-[#a0a0a0]" : "",
                  state === "terminal-bad" ? "text-red-600" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {step.label}
              </p>
              {(state === "done" || state === "active" || state === "terminal-bad") && (
                <p className="mt-0.5 text-xs text-[#7a7a7a]">{step.description}</p>
              )}
              {timestamp && (
                <p className="mt-0.5 text-[11px] text-[#a0a0a0]">
                  {formatDate(timestamp, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
