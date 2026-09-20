import type { AiDecisionMetadata, ControlMode } from "@/lib/supabase/types";
import { runOutputGuardrails } from "./outputGuardrails";

/**
 * Pure, unit-testable function enforcing the 3 control modes in code —
 * this is the actual safety mechanism, not the system prompt. Given a
 * decision + control mode + guardrail-relevant context, decides what
 * happens next. Never touches the network or the database itself; the
 * caller executes the returned plan (send an SMS, write an approval_queue
 * row, insert an appointment).
 *
 * Enforcement order, each layer able to override everything below it:
 *   1. Emergency — bypasses control mode entirely, including Draft.
 *   2. Output guardrails — an unsourced price/time/repair-language hit
 *      force-routes to message approval regardless of control mode,
 *      including Autopilot. This is the real backstop; prompt wording
 *      alone is not trusted.
 *   3. The 3 control modes, as configured for this business.
 */

export type ActionPlan =
  | { type: "escalate_emergency"; text: string }
  | { type: "queue_message_approval"; draftText: string; reason: string }
  | { type: "queue_booking_approval"; appointmentTypeId: string; start: string; holdingText: string }
  | { type: "book_directly"; appointmentTypeId: string; start: string; confirmationText: string }
  | { type: "escalate_priority"; text: string; reason: string }
  | { type: "send_message"; text: string };

export interface DecideActionInput {
  decision: AiDecisionMetadata;
  controlMode: ControlMode;
  toolCallsThisTurn: string[];
  /**
   * Result of checkAutopilotEligibility (autopilotEligibility.ts), a real
   * DB/calendar check. Only read when controlMode is 'autopilot' and
   * decision.booking_ready is true — pass `false` otherwise, it's ignored.
   */
  autopilotEligible: boolean;
}

export function decideAction(input: DecideActionInput): ActionPlan {
  const { decision, controlMode, toolCallsThisTurn, autopilotEligible } = input;

  if (decision.emergency_flag) {
    return { type: "escalate_emergency", text: decision.reply_text };
  }

  const violations = runOutputGuardrails(decision.reply_text, toolCallsThisTurn);
  if (violations.length > 0) {
    return {
      type: "queue_message_approval",
      draftText: decision.reply_text,
      reason: `Guardrail violation: ${violations.map((v) => v.detail).join("; ")}`,
    };
  }

  if (controlMode === "draft") {
    return {
      type: "queue_message_approval",
      draftText: decision.reply_text,
      reason: "Draft mode: every message requires staff approval before sending.",
    };
  }

  if (decision.needs_human) {
    return {
      type: "escalate_priority",
      text: decision.reply_text,
      reason: decision.needs_human_reason ?? "Model flagged needs_human.",
    };
  }

  if (decision.booking_ready && decision.proposed_appointment_type_id && decision.proposed_start) {
    if (controlMode === "autopilot" && autopilotEligible) {
      return {
        type: "book_directly",
        appointmentTypeId: decision.proposed_appointment_type_id,
        start: decision.proposed_start,
        confirmationText: decision.reply_text,
      };
    }

    // Assisted always holds booking for approval; Autopilot falls back to
    // the same approval path when eligibility fails (not connected, not
    // an auto-bookable appointment type) rather than silently dropping it.
    return {
      type: "queue_booking_approval",
      appointmentTypeId: decision.proposed_appointment_type_id,
      start: decision.proposed_start,
      holdingText: decision.reply_text,
    };
  }

  // Assisted and Autopilot both send qualifying replies autonomously —
  // they only differ once booking_ready is true, handled above.
  return { type: "send_message", text: decision.reply_text };
}
