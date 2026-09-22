"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { approveApprovalAction, declineApprovalAction } from "@/lib/approvals/actions";
import { Button, Chip, type ChipTone } from "@/app/_components/ui";
import { TONE_BAR } from "@/app/_components/conversation-status";
import { formatCompact } from "@/lib/format";

interface ApprovalCardProps {
  id: string;
  typeLabel: string;
  summary: string;
  requestedAt: string;
  expiresAt: string;
  tone?: ChipTone;
  /** Who the message/booking is for — omit only when the card already sits inside that conversation. */
  leadName?: string;
  issueLabel?: string;
  conversationId?: string;
}

export function ApprovalCard({
  id,
  typeLabel,
  summary,
  requestedAt,
  expiresAt,
  tone = "amber",
  leadName,
  issueLabel,
  conversationId,
}: ApprovalCardProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "decline" | null>(null);
  const [resolved, setResolved] = useState<"approved" | "declined" | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Computed after mount only — a server-rendered Date.now() would mismatch on hydration.
  const [expiresHint, setExpiresHint] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setExpiresHint(formatExpiresIn(expiresAt));
    update();
    const timer = setInterval(update, 30_000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  async function act(kind: "approve" | "decline") {
    setBusy(kind);
    setError(null);
    const action = kind === "approve" ? approveApprovalAction : declineApprovalAction;
    const result = await action(id);
    setBusy(null);
    if (result.ok) {
      setResolved(kind === "approve" ? "approved" : "declined");
      // Let the confirmation register, then re-fetch so the queue and bell badge stay truthful.
      setTimeout(() => router.refresh(), 900);
    } else {
      setError(result.error ?? "Something went wrong. Try again.");
    }
  }

  return (
    <div className="flex gap-4 rounded-2xl border border-line bg-card p-5 shadow-card">
      <span className={`w-1 shrink-0 self-stretch rounded-full ${TONE_BAR[tone]}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Chip tone={tone}>{typeLabel}</Chip>
          <span className="text-xs tabular-nums text-muted">{formatCompact(requestedAt)}</span>
        </div>

        {leadName && (
          <p className="mt-2.5 truncate text-sm font-semibold text-ink">
            {leadName}
            {issueLabel && <span className="font-normal text-muted"> · {issueLabel}</span>}
          </p>
        )}

        <p className="mt-2 rounded-xl bg-paper px-3.5 py-2.5 text-sm text-ink-soft">{summary}</p>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs tabular-nums text-muted">{expiresHint ?? " "}</span>
            {conversationId && (
              <Link
                href={`/dashboard/leads/${conversationId}`}
                className="text-[13px] font-medium text-accent-blue transition-colors hover:text-accent-blue-deep"
              >
                View conversation
              </Link>
            )}
          </div>
          {resolved ? (
            <span className={`text-sm font-medium ${resolved === "approved" ? "text-gauge-green" : "text-ink-soft"}`}>
              {resolved === "approved" ? "Approved ✓" : "Declined"}
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="danger" onClick={() => act("decline")} disabled={busy !== null}>
                {busy === "decline" ? "Declining…" : "Decline"}
              </Button>
              <Button onClick={() => act("approve")} disabled={busy !== null}>
                {busy === "approve" ? "Approving…" : "Approve"}
              </Button>
            </div>
          )}
        </div>
        {error && <p className="mt-2 text-sm text-gauge-red">{error}</p>}
      </div>
    </div>
  );
}

function formatExpiresIn(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const minutes = Math.ceil(ms / 60_000);
  if (minutes < 60) return `Expires in ${minutes}m`;
  return `Expires in ${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
