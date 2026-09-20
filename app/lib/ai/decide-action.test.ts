import { describe, expect, it } from "vitest";
import { decideAction, type DecideActionInput } from "./decide-action";
import type { AiDecisionMetadata } from "@/lib/supabase/types";

function baseDecision(overrides: Partial<AiDecisionMetadata> = {}): AiDecisionMetadata {
  return {
    reply_text: "Got it, what's the address for the service call?",
    language: "en",
    emergency_flag: false,
    intent: "qualifying",
    booking_ready: false,
    needs_human: false,
    ...overrides,
  };
}

function baseInput(overrides: Partial<DecideActionInput> = {}): DecideActionInput {
  return {
    decision: baseDecision(),
    controlMode: "assisted",
    toolCallsThisTurn: [],
    autopilotEligible: false,
    ...overrides,
  };
}

describe("decideAction", () => {
  it("escalates emergencies regardless of control mode, including draft", () => {
    const input = baseInput({
      controlMode: "draft",
      decision: baseDecision({ emergency_flag: true, reply_text: "leave the house now" }),
    });
    expect(decideAction(input)).toEqual({ type: "escalate_emergency", text: "leave the house now" });
  });

  it("routes a guardrail violation to message approval even in autopilot with booking_ready", () => {
    const input = baseInput({
      controlMode: "autopilot",
      autopilotEligible: true,
      toolCallsThisTurn: [], // no get_pricing_guidance call, but reply states a price
      decision: baseDecision({
        reply_text: "That'll be $150.",
        booking_ready: true,
        proposed_appointment_type_id: "apt-1",
        proposed_start: "2026-01-01T14:00:00Z",
      }),
    });
    const result = decideAction(input);
    expect(result.type).toBe("queue_message_approval");
  });

  it("always queues message approval in draft mode, even when booking_ready is true", () => {
    const input = baseInput({
      controlMode: "draft",
      decision: baseDecision({
        booking_ready: true,
        proposed_appointment_type_id: "apt-1",
        proposed_start: "2026-01-01T14:00:00Z",
      }),
    });
    expect(decideAction(input).type).toBe("queue_message_approval");
  });

  it("escalates non-emergency needs_human regardless of mode", () => {
    const input = baseInput({
      controlMode: "assisted",
      decision: baseDecision({ needs_human: true, needs_human_reason: "conversation stuck" }),
    });
    const result = decideAction(input);
    expect(result).toEqual({
      type: "escalate_priority",
      text: input.decision.reply_text,
      reason: "conversation stuck",
    });
  });

  it("holds booking for approval in assisted mode", () => {
    const input = baseInput({
      controlMode: "assisted",
      decision: baseDecision({
        booking_ready: true,
        proposed_appointment_type_id: "apt-1",
        proposed_start: "2026-01-01T14:00:00Z",
      }),
    });
    expect(decideAction(input)).toEqual({
      type: "queue_booking_approval",
      appointmentTypeId: "apt-1",
      start: "2026-01-01T14:00:00Z",
      holdingText: input.decision.reply_text,
    });
  });

  it("books directly in autopilot mode when eligible", () => {
    const input = baseInput({
      controlMode: "autopilot",
      autopilotEligible: true,
      decision: baseDecision({
        booking_ready: true,
        proposed_appointment_type_id: "apt-1",
        proposed_start: "2026-01-01T14:00:00Z",
      }),
    });
    expect(decideAction(input).type).toBe("book_directly");
  });

  it("falls back to booking approval in autopilot mode when not eligible (never silently drops it)", () => {
    const input = baseInput({
      controlMode: "autopilot",
      autopilotEligible: false,
      decision: baseDecision({
        booking_ready: true,
        proposed_appointment_type_id: "apt-1",
        proposed_start: "2026-01-01T14:00:00Z",
      }),
    });
    expect(decideAction(input).type).toBe("queue_booking_approval");
  });

  it("sends qualifying replies autonomously in assisted mode", () => {
    const input = baseInput({ controlMode: "assisted" });
    expect(decideAction(input)).toEqual({ type: "send_message", text: input.decision.reply_text });
  });

  it("sends qualifying replies autonomously in autopilot mode too, before booking_ready", () => {
    const input = baseInput({ controlMode: "autopilot" });
    expect(decideAction(input)).toEqual({ type: "send_message", text: input.decision.reply_text });
  });
});
