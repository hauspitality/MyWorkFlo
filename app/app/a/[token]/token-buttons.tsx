"use client";

import { useState } from "react";
import { approveByTokenAction, declineByTokenAction } from "@/lib/approvals/token-actions";

interface TokenButtonsProps {
  token: string;
  approvalType: string;
}

export function TokenButtons({ token, approvalType }: TokenButtonsProps) {
  const [busy, setBusy] = useState<"approve" | "decline" | null>(null);
  const [done, setDone] = useState<"approved" | "declined" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(kind: "approve" | "decline") {
    setBusy(kind);
    setError(null);
    const action = kind === "approve" ? approveByTokenAction : declineByTokenAction;
    const result = await action(token);
    setBusy(null);
    if (result.ok) {
      setDone(kind === "approve" ? "approved" : "declined");
    } else {
      setError(result.error ?? "Something went wrong. Try again.");
    }
  }

  if (done === "approved") {
    return (
      <p className="text-sm font-medium text-ink">
        {approvalType === "booking" ? "Approved — the appointment is booked." : "Approved — the message is on its way."}
      </p>
    );
  }
  if (done === "declined") {
    return <p className="text-sm font-medium text-ink">Declined.</p>;
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => act("approve")}
        disabled={busy !== null}
        className="flex h-12 w-full items-center justify-center rounded-full bg-accent-blue font-semibold text-white transition-colors hover:bg-accent-blue-deep disabled:opacity-60"
      >
        {busy === "approve" ? "Approving…" : "Approve"}
      </button>
      <button
        type="button"
        onClick={() => act("decline")}
        disabled={busy !== null}
        className="flex h-12 w-full items-center justify-center rounded-full border border-line font-medium text-gauge-red transition-colors hover:bg-gauge-red-soft disabled:opacity-60"
      >
        {busy === "decline" ? "Declining…" : "Decline"}
      </button>
      {error && <p className="text-sm text-gauge-red">{error}</p>}
    </div>
  );
}
