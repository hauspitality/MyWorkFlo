import type { ChipTone } from "@/app/_components/ui";

export const CONVERSATION_STATUS_TONE: Record<string, ChipTone> = {
  active: "blue",
  awaiting_staff_approval: "amber",
  booked: "green",
  escalated_emergency: "red",
  escalated_priority: "red",
  closed: "neutral",
};

export const CONVERSATION_STATUS_LABEL: Record<string, string> = {
  active: "Active",
  awaiting_staff_approval: "Awaiting approval",
  booked: "Booked",
  escalated_emergency: "Emergency",
  escalated_priority: "Escalated",
  closed: "Closed",
};

export const APPROVAL_TYPE_LABEL: Record<string, string> = {
  outbound_message: "Message needs approval",
  booking: "Booking needs approval",
  emergency_escalation: "Emergency escalation",
  other_exception: "Needs review",
};

/** Urgency tone per approval type — the same mapping everywhere the triage rail appears. */
export const APPROVAL_TYPE_TONE: Record<string, ChipTone> = {
  outbound_message: "blue",
  booking: "green",
  emergency_escalation: "red",
  other_exception: "amber",
};

export const TONE_BAR: Record<string, string> = {
  blue: "bg-gauge-blue",
  green: "bg-gauge-green",
  amber: "bg-gauge-amber",
  red: "bg-gauge-red",
  pink: "bg-gauge-pink",
  neutral: "bg-line-strong",
};

/** Pulls the human-readable line out of an approval payload. */
export function approvalSummary(payload: Record<string, unknown>): string {
  return (
    (payload.draft_text as string) ??
    (payload.reason as string) ??
    (payload.holding_text as string) ??
    "See conversation for details."
  );
}
