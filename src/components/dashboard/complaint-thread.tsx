"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { SendHorizonal } from "lucide-react";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendComplaintMessageAction } from "@/app/(dashboard)/dashboard/orders/_actions";
import type { ComplaintMessage } from "@/lib/data/complaints";
import { createClient } from "@/lib/supabase/client";

export function ComplaintThread({
  complaintId,
  messages: initialMessages,
  currentUserId,
}: {
  complaintId: string;
  messages: ComplaintMessage[];
  currentUserId: string;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`complaint-messages-${complaintId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "complaint_messages",
          filter: `complaint_id=eq.${complaintId}`,
        },
        (payload) => {
          const msg = payload.new as ComplaintMessage;
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [complaintId]);

  function send() {
    if (!text.trim()) return;
    startTransition(async () => {
      const res = await sendComplaintMessageAction(complaintId, text);
      if (res.success) {
        setText("");
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 && <p className="text-[13px] text-[#a0a0a0]">Belum ada pesan.</p>}
        {messages.map((m) => {
          const isMe = m.sender_role === "user";
          return (
            <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                  isMe
                    ? "rounded-br-sm bg-[#EA5329] text-white"
                    : "rounded-bl-sm bg-[#f0f0f0] text-[#1d1d1f]"
                }`}
              >
                {!isMe && (
                  <p className="mb-1 text-[10px] font-semibold text-[#7a7a7a] uppercase">
                    Tim NZO Industries
                  </p>
                )}
                <p>{m.message}</p>
                <p className={`mt-1 text-[10px] ${isMe ? "text-white/60" : "text-[#a0a0a0]"}`}>
                  {formatDate(m.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tulis pesan..."
          rows={2}
          className="resize-none border-[#e0e0e0] text-[14px]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <Button
          type="button"
          variant="primary"
          size="icon"
          onClick={send}
          loading={pending}
          className="h-10 w-10 shrink-0 self-end"
        >
          <SendHorizonal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
