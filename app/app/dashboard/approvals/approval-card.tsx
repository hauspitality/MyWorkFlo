"use client";

import { useEffect, useState } from "react";
import { approveApprovalAction, declineApprovalAction } from "@/lib/approvals/actions";

interface ApprovalCardProps {
  id: string;
  typeLabel: string;
  summary: string;
  requestedAt: string;
  expiresAt: string;
}

export function ApprovalCard({ id, typeLabel, summary, requestedAt, expiresAt }: ApprovalCardProps) {
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
    } else {
      setError(result.error ?? "Something went wrong. Try again.");
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-gauge-amber-soft px-2.5 py-1 text-xs font-medium text-gauge-amber">{typeLabel}</span>
        <span className="text-xs text-muted">{new Date(requestedAt).toLocaleString()}</span>
      </div>
      <p className="mt-3 text-sm text-ink-soft">{summary}</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-muted">{expiresHint ?? " "}</span>
        {resolved ? (
          <span className="text-sm font-medium text-ink-soft">{resolved === "approved" ? "Approved" : "Declined"}</span>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => act("decline")}
              disabled={busy !== null}
              className="h-9 rounded-full border border-line px-4 text-sm font-medium text-gauge-red transition-colors hover:bg-gauge-red-soft disabled:opacity-60"
            >
              {busy === "decline" ? "Declining…" : "Decline"}
            </button>
            <button
              type="button"
              onClick={() => act("approve")}
              disabled={busy !== null}
              className="h-9 rounded-full bg-accent-blue px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-blue-deep disabled:opacity-60"
            >
              {busy === "approve" ? "Approving…" : "Approve"}
            </button>
          </div>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-gauge-red">{error}</p>}
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
