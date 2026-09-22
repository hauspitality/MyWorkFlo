import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { buildConversationContext } from "@/lib/ai/context";
import { runTurn } from "@/lib/ai/engine";
import { decideAction, type ActionPlan } from "@/lib/ai/decide-action";
import { checkAutopilotEligibility } from "@/lib/ai/autopilotEligibility";
import { checkAvailability } from "@/lib/ai/tools";
import { createCalendarEventIfConnected } from "@/lib/calendar/google";
import { getEmergencyAcknowledgment } from "@/lib/hvac/emergencyScripts";
import { detectEmergencySignal } from "@/lib/hvac/emergencySignals";
import { getIssueType } from "@/lib/hvac/taxonomy";
import { notifyBusinessStaff } from "./notify-staff";
import type { AiDecisionMetadata, ControlMode, LeadStatus } from "@/lib/supabase/types";

/**
 * The one production pipeline for an inbound customer message. Both entry
 * points call this — the dev simulator (app/api/dev/simulate-sms) and the
 * real Twilio SMS webhook (app/api/webhooks/twilio/sms) — so the simulator
 * exercises exactly what production runs, by construction rather than by
 * discipline.
 *
 * Resolves lead + conversation, runs the AI turn (with its Layer 1
 * deterministic emergency pre-filter), persists messages, executes the
 * decideAction plan's side effects (approval-queue rows, appointments,
 * audit log, staff notifications), and writes the model's structured read
 * of the conversation (matched_issue_code, collected_fields) back onto the
 * conversation row so the dashboard reflects what the AI actually knows.
 *
 * Idempotency: pass `inboundSid` (the Twilio MessageSid) and the inbound
 * message is inserted BEFORE the AI turn runs, backed by a unique index on
 * messages.twilio_message_sid (migration 0005) — a webhook retry hits the
 * unique violation and returns without running the turn again.
 *
 * Delivery is the caller's concern: pass `deliver` to actually transmit an
 * outbound message (Twilio); omit it and messages are only persisted
 * (simulator). A message row's status is "sent" when delivery succeeded or
 * wasn't requested, "failed" when the deliver callback threw, and "queued"
 * when the plan holds it for staff approval.
 */

export interface ProcessInboundParams {
  businessId: string;
  fromPhone: string;
  body: string;
  /** Twilio MessageSid of the inbound message — enables retry idempotency. */
  inboundSid?: string | null;
  /** Resume a specific conversation (simulator). When omitted, the latest open conversation for this phone is reused, else a new one is created. */
  conversationId?: string;
  /** Only applied when creating a new conversation (simulator's mode picker). Defaults to the business's live control_mode. */
  controlModeOverride?: ControlMode;
  language?: string;
  /** Actually transmit the outbound text; return the provider message sid (or null). Omit to persist without sending. */
  deliver?: (text: string) => Promise<string | null>;
  /**
   * Wait this long after persisting the inbound message; if a newer inbound
   * arrives for the conversation during the wait, skip the AI turn — the
   * newer message's turn sees this text in history and answers everything
   * at once (rapid multi-part texts get one reply, not one each). Skipped
   * for deterministic Layer-1 emergencies, which must never wait.
   */
  debounceMs?: number;
}

export type ExecutedPlan =
  | ActionPlan
  | { type: "emergency_acknowledgment"; text: string }
  | { type: "duplicate_inbound" }
  | { type: "debounced_deferred" };

export interface ProcessInboundResult {
  conversationId: string;
  controlMode: ControlMode;
  decision: AiDecisionMetadata | null;
  plan: ExecutedPlan;
  shortCircuited: boolean;
  toolCallsThisTurn: string[];
}

interface ConversationRow {
  id: string;
  lead_id: string;
  status: string;
  control_mode_snapshot: ControlMode;
  detected_language: string | null;
  collected_fields: Record<string, string> | null;
  turn_count: number;
}

const CONVERSATION_COLUMNS = "id, lead_id, status, control_mode_snapshot, detected_language, collected_fields, turn_count";

const UNIQUE_VIOLATION = "23505";

export async function processInboundMessage(params: ProcessInboundParams): Promise<ProcessInboundResult> {
  const { businessId, fromPhone, body, deliver, inboundSid } = params;
  const db = createServiceClient();

  const { data: business } = await db
    .from("businesses")
    .select("name, control_mode, twilio_phone_number")
    .eq("id", businessId)
    .single();
  if (!business) throw new Error(`Business not found: ${businessId}`);

  const conversation = await resolveConversation(params);

  // Inbound is persisted BEFORE the AI turn: with inboundSid set, a Twilio
  // retry of the same MessageSid hits the unique index and stops here
  // instead of re-running the turn (duplicate replies/approvals/bookings).
  const { data: inboundMsg, error: inboundError } = await db
    .from("messages")
    .insert({
      conversation_id: conversation.id,
      business_id: businessId,
      direction: "inbound",
      sender: "customer",
      body,
      status: "delivered",
      twilio_message_sid: inboundSid ?? null,
    })
    .select("id")
    .single();

  if (inboundError) {
    if (inboundError.code === UNIQUE_VIOLATION) {
      return {
        conversationId: conversation.id,
        controlMode: conversation.control_mode_snapshot,
        decision: null,
        plan: { type: "duplicate_inbound" },
        shortCircuited: true,
        toolCallsThisTurn: [],
      };
    }
    throw new Error(inboundError.message);
  }

  async function insertOutbound(text: string, status: "sent" | "queued" | "failed", metadata: AiDecisionMetadata | null, sid?: string | null) {
    return db
      .from("messages")
      .insert({
        conversation_id: conversation.id,
        business_id: businessId,
        direction: "outbound",
        sender: "ai",
        body: text,
        status,
        twilio_message_sid: sid ?? null,
        ai_metadata: metadata,
      })
      .select("id")
      .single();
  }

  async function insertAudit(eventType: string, entityType: string, entityId: string | null, metadata: Record<string, unknown>) {
    await db.from("audit_log").insert({
      business_id: businessId,
      actor_type: "ai",
      event_type: eventType,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
    });
  }

  /** Deliver if a transport was provided; report how the message row should be marked. */
  async function transmit(text: string): Promise<{ status: "sent" | "failed"; sid: string | null }> {
    if (!deliver) return { status: "sent", sid: null };
    try {
      const sid = await deliver(text);
      return { status: "sent", sid };
    } catch {
      return { status: "failed", sid: null };
    }
  }

  function notifyStaff(smsText: string, push: { title: string; body: string; url?: string }) {
    return notifyBusinessStaff({ businessId, businessTwilioNumber: business!.twilio_phone_number, smsText, push });
  }

  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  // A conversation already escalated as an emergency gets the fixed
  // acknowledgment, never another model turn — a human is already on it,
  // and "the AI keeps trying to help" is exactly the failure mode to avoid.
  if (conversation.status === "escalated_emergency") {
    const ackText = getEmergencyAcknowledgment();
    const delivery = await transmit(ackText);
    await insertOutbound(ackText, delivery.status, null, delivery.sid);
    await db
      .from("conversations")
      .update({ turn_count: conversation.turn_count + 1, last_message_at: new Date().toISOString() })
      .eq("id", conversation.id);
    return {
      conversationId: conversation.id,
      controlMode: conversation.control_mode_snapshot,
      decision: null,
      plan: { type: "emergency_acknowledgment", text: ackText },
      shortCircuited: true,
      toolCallsThisTurn: [],
    };
  }

  // Debounce rapid multi-part texts: wait briefly, and if a newer inbound
  // arrived meanwhile, defer to its turn (which sees this text in history).
  // Deterministic Layer-1 emergencies never wait — the fixed safety script
  // must go out immediately.
  if (params.debounceMs && params.debounceMs > 0) {
    const { data: settings } = await db
      .from("service_settings")
      .select("emergency_keywords")
      .eq("business_id", businessId)
      .maybeSingle();
    const isEmergency = detectEmergencySignal(body, settings?.emergency_keywords ?? []);
    if (!isEmergency) {
      await new Promise((resolve) => setTimeout(resolve, params.debounceMs));
      const { data: newest } = await db
        .from("messages")
        .select("id")
        .eq("conversation_id", conversation.id)
        .eq("direction", "inbound")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (newest && newest.id !== inboundMsg.id) {
        return {
          conversationId: conversation.id,
          controlMode: conversation.control_mode_snapshot,
          decision: null,
          plan: { type: "debounced_deferred" },
          shortCircuited: true,
          toolCallsThisTurn: [],
        };
      }
    }
  }

  // History excludes the inbound row inserted above — runTurn folds the new
  // text in itself (engine.ts persists nothing by design).
  const context = await buildConversationContext(conversation.id, { excludeMessageId: inboundMsg.id });
  const turnResult = await runTurn(context, body);
  const decision = turnResult.decision;

  // Hard cap from the plan: past ~8 exchanges without a booking, stop
  // looping and get a person involved — regardless of what the model
  // thinks. The prompt asks for this too; this is the code guarantee.
  if (conversation.turn_count >= 7 && !decision.emergency_flag && !decision.booking_ready && !decision.needs_human) {
    decision.needs_human = true;
    decision.needs_human_reason = `Conversation reached ${conversation.turn_count + 1} exchanges without resolution`;
  }

  // Autopilot may only book a slot that (a) passes the standing eligibility
  // checks and (b) is a real, currently-open slot per checkAvailability —
  // the model's proposed_start is a claim, not a fact; without this
  // re-check it could book an invented or stale time. Ineligibility
  // downgrades to queue_booking_approval inside decideAction, never a drop.
  let autopilotEligible = false;
  if (conversation.control_mode_snapshot === "autopilot" && decision.booking_ready && decision.proposed_appointment_type_id) {
    autopilotEligible = await checkAutopilotEligibility(businessId, decision.proposed_appointment_type_id);
    if (autopilotEligible) {
      const proposed = decision.proposed_start ? new Date(decision.proposed_start).getTime() : NaN;
      if (Number.isNaN(proposed) || proposed <= Date.now()) {
        autopilotEligible = false;
      } else {
        const slots = await checkAvailability({ businessId }, { appointment_type_id: decision.proposed_appointment_type_id });
        autopilotEligible = slots.some((s) => new Date(s.start).getTime() === proposed);
      }
    }
  }

  const plan = decideAction({
    decision,
    controlMode: conversation.control_mode_snapshot,
    toolCallsThisTurn: turnResult.toolCallsThisTurn,
    autopilotEligible,
  });

  let conversationStatus: string | null = null;
  let executedPlan: ExecutedPlan = plan;

  switch (plan.type) {
    case "escalate_emergency": {
      const delivery = await transmit(plan.text);
      await insertOutbound(plan.text, delivery.status, decision, delivery.sid);
      conversationStatus = "escalated_emergency";
      await insertAudit("emergency_escalated", "conversation", conversation.id, { category: decision.emergency_category });
      // The locked script just told the customer "we've alerted the team" —
      // make that true. Failures are audited inside notifyStaff.
      await notifyStaff(
        `EMERGENCY (${decision.emergency_category ?? "unspecified"}) reported by ${fromPhone}. The safety script was sent. Call them now: ${fromPhone}`,
        {
          title: "EMERGENCY escalation",
          body: `${decision.emergency_category ?? "Safety emergency"} — ${fromPhone}`,
          url: `${appBaseUrl}/dashboard/leads/${conversation.id}`,
        },
      );
      break;
    }
    case "queue_message_approval": {
      const { data: msg } = await insertOutbound(plan.draftText, "queued", decision);
      const { data: approval } = await db
        .from("approval_queue")
        .insert({
          business_id: businessId,
          conversation_id: conversation.id,
          type: "outbound_message",
          payload: { draft_text: plan.draftText, reason: plan.reason, message_id: msg?.id ?? null },
        })
        .select("id, magic_link_token")
        .single();
      conversationStatus = "awaiting_staff_approval";
      await insertAudit("message_queued_for_approval", "message", msg?.id ?? null, { reason: plan.reason });
      if (approval) {
        await notifyStaff(
          `MyWorkFlo drafted a reply to ${fromPhone}: "${plan.draftText}" — reply YES to send, NO to discard, or review: ${appBaseUrl}/a/${approval.magic_link_token}`,
          { title: "Reply needs your approval", body: plan.draftText, url: `${appBaseUrl}/a/${approval.magic_link_token}` },
        );
      } else {
        await insertAudit("approval_insert_failed", "conversation", conversation.id, { type: "outbound_message" });
      }
      break;
    }
    case "queue_booking_approval": {
      const delivery = await transmit(plan.holdingText);
      await insertOutbound(plan.holdingText, delivery.status, decision, delivery.sid);
      const { data: approval } = await db
        .from("approval_queue")
        .insert({
          business_id: businessId,
          conversation_id: conversation.id,
          type: "booking",
          payload: { appointment_type_id: plan.appointmentTypeId, start: plan.start },
        })
        .select("id, magic_link_token")
        .single();
      conversationStatus = "awaiting_staff_approval";
      await insertAudit("booking_queued_for_approval", "conversation", conversation.id, {
        appointment_type_id: plan.appointmentTypeId,
        start: plan.start,
      });
      if (approval) {
        await notifyStaff(
          `MyWorkFlo wants to book ${fromPhone} for ${new Date(plan.start).toLocaleString()} — reply YES to confirm, NO to decline, or review: ${appBaseUrl}/a/${approval.magic_link_token}`,
          { title: "Booking needs your approval", body: `${fromPhone} — ${new Date(plan.start).toLocaleString()}`, url: `${appBaseUrl}/a/${approval.magic_link_token}` },
        );
      } else {
        await insertAudit("approval_insert_failed", "conversation", conversation.id, { type: "booking" });
      }
      break;
    }
    case "book_directly": {
      const appointmentType = context.appointmentTypes.find((t) => t.id === plan.appointmentTypeId);
      const durationMinutes = appointmentType?.duration_minutes ?? 60;
      const start = new Date(plan.start);
      const end = new Date(start.getTime() + durationMinutes * 60_000);

      const { data: appointment, error: appointmentError } = await db
        .from("appointments")
        .insert({
          business_id: businessId,
          lead_id: conversation.lead_id,
          conversation_id: conversation.id,
          appointment_type_id: plan.appointmentTypeId,
          scheduled_start: start.toISOString(),
          scheduled_end: end.toISOString(),
          status: "confirmed",
          booked_via: "autopilot",
        })
        .select("id")
        .single();

      if (appointmentError || !appointment) {
        // Never tell the customer "you're booked" for a booking that didn't
        // persist — downgrade to the assisted approval path instead.
        await insertAudit("autopilot_booking_failed", "conversation", conversation.id, {
          error: appointmentError?.message ?? "insert returned no row",
          appointment_type_id: plan.appointmentTypeId,
          start: plan.start,
        });
        const holdingText = "Let me double-check that time with the team and confirm right back.";
        const delivery = await transmit(holdingText);
        await insertOutbound(holdingText, delivery.status, decision, delivery.sid);
        const { data: approval } = await db
          .from("approval_queue")
          .insert({
            business_id: businessId,
            conversation_id: conversation.id,
            type: "booking",
            payload: { appointment_type_id: plan.appointmentTypeId, start: plan.start },
          })
          .select("id, magic_link_token")
          .single();
        conversationStatus = "awaiting_staff_approval";
        if (approval) {
          await notifyStaff(
            `Autopilot booking for ${fromPhone} failed to save — review and confirm: ${appBaseUrl}/a/${approval.magic_link_token}`,
            { title: "Booking needs your approval", body: `${fromPhone} — autopilot fallback`, url: `${appBaseUrl}/a/${approval.magic_link_token}` },
          );
        }
        executedPlan = {
          type: "queue_booking_approval",
          appointmentTypeId: plan.appointmentTypeId,
          start: plan.start,
          holdingText,
        };
        break;
      }

      // Mirror the booking onto the business's Google Calendar when one is
      // connected. Never blocks the booking: the helper resolves null on
      // no-connection or any calendar error, and the appointment row is
      // already committed above.
      const collected = { ...(conversation.collected_fields ?? {}), ...(decision.collected_fields ?? {}) };
      const contact = collected.name ?? collected.customer_name ?? fromPhone;
      const eventId = await createCalendarEventIfConnected({
        businessId,
        summary: `${appointmentType?.name ?? "Service visit"} — ${contact}`,
        description: [
          "Booked by MyWorkFlo AI (autopilot).",
          `Phone: ${fromPhone}`,
          ...Object.entries(collected).map(([key, value]) => `${key}: ${value}`),
        ].join("\n"),
        startIso: start.toISOString(),
        endIso: end.toISOString(),
      });
      if (eventId) {
        await db.from("appointments").update({ google_event_id: eventId }).eq("id", appointment.id);
      }

      const delivery = await transmit(plan.confirmationText);
      await insertOutbound(plan.confirmationText, delivery.status, decision, delivery.sid);
      conversationStatus = "booked";
      await insertAudit("appointment_booked", "appointment", appointment.id, {
        appointment_type_id: plan.appointmentTypeId,
        start: plan.start,
      });
      break;
    }
    case "escalate_priority": {
      const delivery = await transmit(plan.text);
      await insertOutbound(plan.text, delivery.status, decision, delivery.sid);
      conversationStatus = "escalated_priority";
      await insertAudit("priority_escalation", "conversation", conversation.id, { reason: plan.reason });
      await notifyStaff(
        `MyWorkFlo needs a human on ${fromPhone}: ${plan.reason}`,
        { title: "Conversation needs a human", body: plan.reason, url: `${appBaseUrl}/dashboard/leads/${conversation.id}` },
      );
      break;
    }
    case "send_message": {
      const delivery = await transmit(plan.text);
      await insertOutbound(plan.text, delivery.status, decision, delivery.sid);
      break;
    }
  }

  // Persist the model's structured read back onto the conversation so the
  // dashboard (Leads list, lead detail) reflects what the AI actually
  // knows. collected_fields merges over prior turns rather than replacing,
  // since each turn's decision only restates what it saw this turn.
  // matched_issue_code is FK-constrained to hvac_issue_types — validate
  // against the code taxonomy first so a hallucinated code (or an unseeded
  // table) can't reject the entire update and silently lose the turn.
  const issueCode =
    decision.matched_issue_code && getIssueType(decision.matched_issue_code) ? decision.matched_issue_code : null;
  const { error: convoUpdateError } = await db
    .from("conversations")
    .update({
      ...(conversationStatus ? { status: conversationStatus } : {}),
      ...(issueCode ? { matched_issue_code: issueCode } : {}),
      collected_fields: { ...(conversation.collected_fields ?? {}), ...(decision.collected_fields ?? {}) },
      detected_language: conversation.detected_language ?? decision.language,
      turn_count: conversation.turn_count + 1,
      last_message_at: new Date().toISOString(),
    })
    .eq("id", conversation.id);
  if (convoUpdateError) {
    // The turn's messages/side effects already persisted — losing the
    // conversation-state update is recoverable, but never silent.
    await insertAudit("conversation_update_failed", "conversation", conversation.id, { error: convoUpdateError.message });
  }

  // Keep leads.status meaningful for the Leads list (it was stuck on "new"
  // forever otherwise). Emergency/priority → escalated so escalations stay
  // visible on the lead itself, not just the conversation.
  const LEAD_STATUS_BY_PLAN: Record<string, LeadStatus> = {
    send_message: "qualifying",
    queue_message_approval: "qualifying",
    queue_booking_approval: "booking_pending_approval",
    book_directly: "booked",
    escalate_emergency: "escalated",
    escalate_priority: "escalated",
  };
  const leadStatus = LEAD_STATUS_BY_PLAN[executedPlan.type];
  if (leadStatus) {
    await db.from("leads").update({ status: leadStatus }).eq("id", conversation.lead_id);
  }

  return {
    conversationId: conversation.id,
    controlMode: conversation.control_mode_snapshot,
    decision,
    plan: executedPlan,
    shortCircuited: turnResult.shortCircuited,
    toolCallsThisTurn: turnResult.toolCallsThisTurn,
  };

  async function resolveConversation(p: ProcessInboundParams): Promise<ConversationRow> {
    if (p.conversationId) {
      const { data } = await db
        .from("conversations")
        .select(CONVERSATION_COLUMNS)
        .eq("id", p.conversationId)
        .eq("business_id", p.businessId)
        .single();
      if (!data) throw new Error(`Conversation not found: ${p.conversationId}`);
      return data as ConversationRow;
    }

    // Find-or-create guarded against the concurrent-first-text race by the
    // unique index on (business_id, source_phone_number) — a losing insert
    // re-reads instead of creating a duplicate. The read uses limit(1)
    // rather than maybeSingle so any legacy duplicates degrade gracefully.
    const { data: existingLeads } = await db
      .from("leads")
      .select("id")
      .eq("business_id", p.businessId)
      .eq("source_phone_number", p.fromPhone)
      .order("created_at", { ascending: true })
      .limit(1);

    let leadId = existingLeads?.[0]?.id;
    if (!leadId) {
      const { data: newLead, error } = await db
        .from("leads")
        .insert({ business_id: p.businessId, source_phone_number: p.fromPhone, language: p.language ?? null })
        .select("id")
        .single();
      if (error?.code === UNIQUE_VIOLATION) {
        const { data: raced } = await db
          .from("leads")
          .select("id")
          .eq("business_id", p.businessId)
          .eq("source_phone_number", p.fromPhone)
          .order("created_at", { ascending: true })
          .limit(1);
        leadId = raced?.[0]?.id;
      } else if (error || !newLead) {
        throw new Error(error?.message ?? "Failed to create lead");
      } else {
        leadId = newLead.id;
      }
    }
    if (!leadId) throw new Error("Failed to resolve lead");

    // Reuse the latest still-open thread for this phone; closed and booked
    // conversations stay closed — a new text after either starts fresh.
    const { data: openConversation } = await db
      .from("conversations")
      .select(CONVERSATION_COLUMNS)
      .eq("business_id", p.businessId)
      .eq("lead_id", leadId)
      .not("status", "in", "(closed,booked)")
      .order("last_message_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (openConversation) return openConversation as ConversationRow;

    const { data: created, error: createError } = await db
      .from("conversations")
      .insert({
        business_id: p.businessId,
        lead_id: leadId,
        control_mode_snapshot: p.controlModeOverride ?? (business?.control_mode as ControlMode) ?? "draft",
        detected_language: p.language ?? null,
      })
      .select(CONVERSATION_COLUMNS)
      .single();
    if (createError || !created) throw new Error(createError?.message ?? "Failed to create conversation");
    return created as ConversationRow;
  }
}
