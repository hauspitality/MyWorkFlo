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

export interface BookingSummaryContext {
  /** Resolved name of the appointment type referenced by the booking payload. */
  appointmentTypeName?: string | null;
  /** IANA timezone of the business — booking times always render in it. */
  timezone?: string | null;
}

/**
 * Pulls the human-readable line out of an approval payload. When the caller
 * has resolved booking context (appointment type name + business timezone),
 * a booking payload renders as "{Appointment type} — {weekday, date, time}"
 * instead of pointing at the conversation.
 */
export function approvalSummary(payload: Record<string, unknown>, booking?: BookingSummaryContext | null): string {
  const startIso = typeof payload.start === "string" ? payload.start : null;
  if (booking && startIso) {
    return `${booking.appointmentTypeName ?? "Service visit"} — ${formatWhenInTimezone(startIso, booking.timezone)}`;
  }
  return (
    (payload.draft_text as string) ??
    (payload.reason as string) ??
    (payload.holding_text as string) ??
    "See conversation for details."
  );
}

/** "Tue, Sep 22, 2:30 PM" in the business's timezone (Eastern, then UTC, as fallbacks). */
export function formatWhenInTimezone(startIso: string, timezone: string | null | undefined): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  };
  try {
    return new Date(startIso).toLocaleString("en-US", { ...options, timeZone: timezone ?? "America/New_York" });
  } catch {
    // Invalid timezone string on the business row — fall back rather than crash the page.
    return new Date(startIso).toLocaleString("en-US", { ...options, timeZone: "UTC" });
  }
}
