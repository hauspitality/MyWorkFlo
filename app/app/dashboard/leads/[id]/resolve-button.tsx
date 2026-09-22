"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/_components/ui";
import { markConversationResolvedAction } from "@/lib/messaging/staff-reply";

/**
 * "Mark resolved" on the lead detail header — closes the conversation
 * (never the lead). For emergency threads, a confirm step makes sure a
 * person actually handled it before the thread is stood down.
 */
export function ResolveButton({ conversationId, confirmFirst }: { conversationId: string; confirmFirst?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resolve() {
    if (busy) return;
    if (confirmFirst && !window.confirm("Only close this after a person has handled the emergency.")) return;
    setBusy(true);
    setError(null);
    const result = await markConversationResolvedAction(conversationId);
    setBusy(false);
    if (result.ok) {
      router.refresh();
    } else {
      setError(result.error ?? "Something went wrong. Try again.");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="secondary" onClick={resolve} disabled={busy}>
        {busy ? "Closing…" : "Mark resolved"}
      </Button>
      {error && <p className="text-xs text-gauge-red">{error}</p>}
    </div>
  );
}
