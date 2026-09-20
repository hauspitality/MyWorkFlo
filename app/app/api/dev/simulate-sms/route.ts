import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { buildConversationContext } from "@/lib/ai/context";
import { runTurn } from "@/lib/ai/engine";
import { decideAction, type ActionPlan } from "@/lib/ai/decide-action";
import { checkAutopilotEligibility } from "@/lib/ai/autopilotEligibility";
import type { AiDecisionMetadata, ControlMode } from "@/lib/supabase/types";

/**
 * Dev-only route: runs an inbound customer text through the exact
 * production pipeline (context assembly -> tool-calling model turn ->
 * guardrail scan -> control-mode gate -> persistence) that the real Twilio
 * SMS webhook will call in Phase 5. This is how the pipeline gets validated
 * before a real phone number exists.
 *
 * Auth: the caller must be a logged-in staff member of the target business
 * (checked via the session client, RLS-scoped) even though every write
 * below uses the service-role client, exactly like the AI engine will in
 * production. That staff check is the defense-in-depth layer replacing RLS
 * for this route, matching the pattern documented in decide-action.ts.
 */

const requestSchema = z.object({
  businessId: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
  controlMode: z.enum(["draft", "assisted", "autopilot"]).optional(),
  language: z.string().optional(),
  phone: z.string().min(3).default("+15555550100"),
  body: z.string().min(1, "Message body is required"),
});

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_DEV_SIMULATOR !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const input = parsed.data;

  const staffQuery = supabase.from("staff").select("business_id").eq("user_id", user.id).eq("is_active", true);
  const { data: staffRow } = input.businessId
    ? await staffQuery.eq("business_id", input.businessId).maybeSingle()
    : await staffQuery.limit(1).maybeSingle();

  if (!staffRow) {
    return NextResponse.json(
      { error: "No business found for this account. Seed a dev business first." },
      { status: 404 },
    );
  }
  const businessId = staffRow.business_id;

  const db = createServiceClient();

  const { data: business } = await db
    .from("businesses")
    .select("id, name, control_mode")
    .eq("id", businessId)
    .single();
  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  let conversation: {
    id: string;
    business_id: string;
    lead_id: string;
    control_mode_snapshot: ControlMode;
    detected_language: string | null;
    turn_count: number;
  };

  if (input.conversationId) {
    const { data: existing } = await db
      .from("conversations")
      .select("id, business_id, lead_id, control_mode_snapshot, detected_language, turn_count")
      .eq("id", input.conversationId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    if (existing.business_id !== businessId) {
      return NextResponse.json({ error: "Conversation belongs to a different business" }, { status: 403 });
    }
    conversation = existing;
  } else {
    const { data: existingLead } = await db
      .from("leads")
      .select("id")
      .eq("business_id", businessId)
      .eq("source_phone_number", input.phone)
      .maybeSingle();

    const leadId =
      existingLead?.id ??
      (
        await db
          .from("leads")
          .insert({ business_id: businessId, source_phone_number: input.phone, language: input.language ?? null })
          .select("id")
          .single()
      ).data?.id;

    if (!leadId) {
      return NextResponse.json({ error: "Failed to create dev lead" }, { status: 500 });
    }

    const { data: created, error: createError } = await db
      .from("conversations")
      .insert({
        business_id: businessId,
        lead_id: leadId,
        control_mode_snapshot: input.controlMode ?? business.control_mode,
        detected_language: input.language ?? null,
      })
      .select("id, business_id, lead_id, control_mode_snapshot, detected_language, turn_count")
      .single();

    if (createError || !created) {
      return NextResponse.json({ error: createError?.message ?? "Failed to create conversation" }, { status: 500 });
    }
    conversation = created;
  }

  // Build context from history BEFORE this turn's inbound text, then let
  // runTurn fold the new text in — matches how the Twilio webhook will call
  // this (see engine.ts's doc comment: it does not persist anything itself).
  const context = await buildConversationContext(conversation.id);
  const turnResult = await runTurn(context, input.body);
  const decision: AiDecisionMetadata = turnResult.decision;

  await db.from("messages").insert({
    conversation_id: conversation.id,
    business_id: businessId,
    direction: "inbound",
    sender: "customer",
    body: input.body,
    status: "delivered",
  });

  let autopilotEligible = false;
  if (
    conversation.control_mode_snapshot === "autopilot" &&
    decision.booking_ready &&
    decision.proposed_appointment_type_id
  ) {
    autopilotEligible = await checkAutopilotEligibility(businessId, decision.proposed_appointment_type_id);
  }

  const plan: ActionPlan = decideAction({
    decision,
    controlMode: conversation.control_mode_snapshot,
    toolCallsThisTurn: turnResult.toolCallsThisTurn,
    autopilotEligible,
  });

  const nowIso = new Date().toISOString();
  let conversationStatus: string | null = null;

  switch (plan.type) {
    case "escalate_emergency": {
      await insertOutbound(plan.text, "sent", decision);
      conversationStatus = "escalated_emergency";
      await insertAudit("emergency_escalated", "conversation", conversation.id, {
        category: decision.emergency_category,
      });
      break;
    }
    case "queue_message_approval": {
      const { data: msg } = await insertOutbound(plan.draftText, "queued", decision);
      await db.from("approval_queue").insert({
        business_id: businessId,
        conversation_id: conversation.id,
        type: "outbound_message",
        payload: { draft_text: plan.draftText, reason: plan.reason, message_id: msg?.id ?? null },
      });
      conversationStatus = "awaiting_staff_approval";
      await insertAudit("message_queued_for_approval", "message", msg?.id ?? null, { reason: plan.reason });
      break;
    }
    case "queue_booking_approval": {
      await insertOutbound(plan.holdingText, "sent", decision);
      await db.from("approval_queue").insert({
        business_id: businessId,
        conversation_id: conversation.id,
        type: "booking",
        payload: { appointment_type_id: plan.appointmentTypeId, start: plan.start },
      });
      conversationStatus = "awaiting_staff_approval";
      await insertAudit("booking_queued_for_approval", "conversation", conversation.id, {
        appointment_type_id: plan.appointmentTypeId,
        start: plan.start,
      });
      break;
    }
    case "book_directly": {
      const appointmentType = context.appointmentTypes.find((t) => t.id === plan.appointmentTypeId);
      const durationMinutes = appointmentType?.duration_minutes ?? 60;
      const start = new Date(plan.start);
      const end = new Date(start.getTime() + durationMinutes * 60_000);

      const { data: appointment } = await db
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

      await insertOutbound(plan.confirmationText, "sent", decision);
      conversationStatus = "booked";
      await insertAudit("appointment_booked", "appointment", appointment?.id ?? null, {
        appointment_type_id: plan.appointmentTypeId,
        start: plan.start,
      });
      break;
    }
    case "escalate_priority": {
      await insertOutbound(plan.text, "sent", decision);
      conversationStatus = "escalated_priority";
      await insertAudit("priority_escalation", "conversation", conversation.id, { reason: plan.reason });
      break;
    }
    case "send_message": {
      await insertOutbound(plan.text, "sent", decision);
      break;
    }
  }

  await db
    .from("conversations")
    .update({
      ...(conversationStatus ? { status: conversationStatus } : {}),
      detected_language: conversation.detected_language ?? decision.language,
      turn_count: conversation.turn_count + 1,
      last_message_at: nowIso,
    })
    .eq("id", conversation.id);

  const { data: thread } = await db
    .from("messages")
    .select("id, direction, sender, body, status, ai_metadata, created_at")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true });

  return NextResponse.json({
    conversationId: conversation.id,
    controlMode: conversation.control_mode_snapshot,
    decision,
    shortCircuited: turnResult.shortCircuited,
    toolCallsThisTurn: turnResult.toolCallsThisTurn,
    actionPlan: plan,
    thread: thread ?? [],
  });

  async function insertOutbound(body: string, status: "sent" | "queued", metadata: AiDecisionMetadata) {
    return db
      .from("messages")
      .insert({
        conversation_id: conversation.id,
        business_id: businessId,
        direction: "outbound",
        sender: "ai",
        body,
        status,
        ai_metadata: metadata,
      })
      .select("id")
      .single();
  }

  async function insertAudit(
    eventType: string,
    entityType: string,
    entityId: string | null,
    metadata: Record<string, unknown>,
  ) {
    await db.from("audit_log").insert({
      business_id: businessId,
      actor_type: "ai",
      event_type: eventType,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
    });
  }
}
