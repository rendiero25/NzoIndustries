"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { SendHorizonal } from "lucide-react";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendAdminComplaintMessage } from "../../_actions";
import { createClient } from "@/lib/supabase/legacy/client";

type Message = { id: string; sender_role: string; message: string; created_at: string };

export function AdminComplaintThread({
  complaintId,
  messages: initialMessages,
}: {
  complaintId: string;
  messages: Message[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`admin-complaint-messages-${complaintId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "complaint_messages",
          filter: `complaint_id=eq.${complaintId}`,
        },
        (payload) => {
          const msg = payload.new as Message;
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
      const { error } = await sendAdminComplaintMessage(complaintId, text);
      if (error) toast.error(error);
      else setText("");
    });
  }

  return (
    <div className="space-y-4">
      <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <p className="text-[13px] text-muted-foreground">Belum ada pesan.</p>
        )}
        {messages.map((m) => {
          const isAdmin = m.sender_role === "admin";
          return (
            <div key={m.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                  isAdmin
                    ? "rounded-br-sm bg-[#EA5329] text-white"
                    : "rounded-bl-sm bg-muted text-foreground"
                }`}
              >
                {!isAdmin && (
                  <p className="mb-1 text-[10px] font-semibold text-muted-foreground uppercase">
                    Pelanggan
                  </p>
                )}
                <p>{m.message}</p>
                <p
                  className={`mt-1 text-[10px] ${isAdmin ? "text-white/60" : "text-muted-foreground"}`}
                >
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
          placeholder="Balas ke pelanggan..."
          rows={2}
          className="resize-none text-[14px]"
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
