"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/_components/ui";
import { sendStaffReplyAction } from "@/lib/messaging/staff-reply";

/**
 * In-app reply box under the conversation thread. Sends as a real text from
 * the business number via a server action; the thread refreshes on success.
 */
export function ReplyComposer({ conversationId, disabledReason }: { conversationId: string; disabledReason?: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (disabledReason) {
    return (
      <div className="border-t border-line px-5 py-4 sm:px-6">
        <p className="text-sm text-muted">{disabledReason}</p>
      </div>
    );
  }

  async function send() {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    setError(null);
    const result = await sendStaffReplyAction(conversationId, body);
    setBusy(false);
    if (result.ok) {
      setText("");
      router.refresh();
    } else {
      setError(result.error ?? "Something went wrong. Try again.");
    }
  }

  return (
    <div className="border-t border-line px-5 py-4 sm:px-6">
      <label htmlFor="staff-reply" className="sr-only">
        Reply to this customer
      </label>
      <textarea
        id="staff-reply"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void send();
          }
        }}
        placeholder="Write a reply…"
        rows={2}
        disabled={busy}
        className="w-full resize-y rounded-xl border border-line bg-paper px-4 py-3 text-sm text-ink outline-none placeholder:text-muted focus:border-accent-blue/50 focus:ring-2 focus:ring-accent-blue/15 disabled:opacity-60"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-xs text-muted">Sends as a text from your business number.</p>
        <Button onClick={send} disabled={busy || !text.trim()}>
          {busy ? "Sending…" : "Send"}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-gauge-red">{error}</p>}
    </div>
  );
}
