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
  /** Shown next to the name — omit when the name line already is the phone number. */
  leadPhone?: string;
  issueLabel?: string;
  conversationId?: string;
  /** Outbound-message draft — when set, the card shows an editable textarea and Approve sends the current text. */
  draftText?: string;
  /** Past its window but not yet swept: shown for the record only, no live actions. */
  expired?: boolean;
}

export function ApprovalCard({
  id,
  typeLabel,
  summary,
  requestedAt,
  expiresAt,
  tone = "amber",
  leadName,
  leadPhone,
  issueLabel,
  conversationId,
  draftText,
  expired = false,
}: ApprovalCardProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "decline" | null>(null);
  const [resolved, setResolved] = useState<"approved" | "declined" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState(draftText ?? "");
  // Computed after mount only — a server-rendered Date.now() would mismatch on hydration.
  const [expiresHint, setExpiresHint] = useState<string | null>(null);

  useEffect(() => {
    if (expired) return;
    const update = () => setExpiresHint(formatExpiresIn(expiresAt));
    update();
    const timer = setInterval(update, 30_000);
    return () => clearInterval(timer);
  }, [expiresAt, expired]);

  const editable = draftText !== undefined && !expired;

  async function act(kind: "approve" | "decline") {
    setBusy(kind);
    setError(null);
    let result;
    if (kind === "approve") {
      // Only pass the text through when it actually changed — an untouched
      // draft approves exactly as stored.
      const trimmed = text.trim();
      const editedText = editable && trimmed !== draftText.trim() ? trimmed : undefined;
      result = await approveApprovalAction(id, editedText);
    } else {
      result = await declineApprovalAction(id);
    }
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
      <span className={`w-1 shrink-0 self-stretch rounded-full ${expired ? TONE_BAR.neutral : TONE_BAR[tone]}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Chip tone={expired ? "neutral" : tone}>{typeLabel}</Chip>
          <span className="text-xs tabular-nums text-muted">{formatCompact(requestedAt)}</span>
        </div>

        {leadName && (
          <p className="mt-2.5 truncate text-sm font-semibold text-ink">
            {leadName}
            {leadPhone && <span className="font-normal text-muted"> · {leadPhone}</span>}
            {issueLabel && <span className="font-normal text-muted"> · {issueLabel}</span>}
          </p>
        )}

        {editable && !resolved ? (
          <>
            <label htmlFor={`draft-${id}`} className="mt-2.5 flex items-center gap-1.5 text-xs text-muted">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="M16.5 4.5 19.5 7.5 8 19l-4 1 1-4L16.5 4.5Z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Edit before sending
            </label>
            <textarea
              id={`draft-${id}`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              disabled={busy !== null}
              className="mt-1.5 w-full resize-y rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink-soft outline-none transition-colors focus:border-accent-blue/50 focus:bg-card focus:text-ink disabled:opacity-60"
            />
          </>
        ) : (
          // After an edited approve, show what was actually sent, not the stale draft.
          <p className="mt-2 rounded-xl bg-paper px-3.5 py-2.5 text-sm text-ink-soft">{editable ? text : summary}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {expired ? (
              <span className="text-xs text-muted">Expired — the customer was told a person will follow up.</span>
            ) : (
              <span className="text-xs tabular-nums text-muted">{expiresHint ?? " "}</span>
            )}
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
              <Button variant="danger" onClick={() => act("decline")} disabled={expired || busy !== null}>
                {busy === "decline" ? "Declining…" : "Decline"}
              </Button>
              <Button onClick={() => act("approve")} disabled={expired || busy !== null || (editable && !text.trim())}>
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
