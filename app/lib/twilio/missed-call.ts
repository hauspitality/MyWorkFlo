import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { missedCallOpener, toCustomerLang } from "@/lib/messaging/customer-strings";
import { sendSms } from "@/lib/twilio/client";
import type { CallStatus, ControlMode } from "@/lib/supabase/types";

/**
 * Missed-call text-back: record the call, find-or-create the lead, and open
 * the SMS thread with a friendly opener so the caller can just reply.
 * Shared by the voice webhook (no owner to dial) and the voice-status
 * webhook (owner didn't pick up).
 *
 * Lead/conversation resolution deliberately mirrors
 * lib/messaging/process-inbound.ts resolveConversation (small local
 * duplicate by design — that module's shape is pinned by other callers).
 */

export async function recordMissedCallAndTextBack(params: {
  businessId: string;
  businessName: string;
  /** The business's Twilio number — the From of the text-back. */
  businessPhone: string;
  callerPhone: string;
  callSid: string | null;
  status: CallStatus;
}): Promise<void> {
  const { businessId, businessName, businessPhone, callerPhone, callSid, status } = params;
  const db = createServiceClient();

  const { data: business } = await db
    .from("businesses")
    .select("subscription_status")
    .eq("id", businessId)
    .maybeSingle();

  const { data: existingLead } = await db
    .from("leads")
    .select("id, language, status")
    .eq("business_id", businessId)
    .eq("source_phone_number", callerPhone)
    .maybeSingle();

  let leadId: string;
  if (existingLead?.id) {
    leadId = existingLead.id;
  } else {
    const { data: newLead, error } = await db
      .from("leads")
      .insert({ business_id: businessId, source_phone_number: callerPhone })
      .select("id")
      .single();
    if (error || !newLead) throw new Error(error?.message ?? "Failed to create lead");
    leadId = newLead.id;
  }

  // Two reasons to record the call but never send the opener:
  // - subscription_canceled: messaging is paused when the subscription is
  //   canceled (null = pre-billing/dev; past_due keeps running through
  //   Stripe's retry + grace window) — no outbound texts on a lapsed plan.
  // - customer_opted_out: a lead who texted STOP must never get another
  //   text from us, including the missed-call opener.
  // Either way this runs BEFORE the text-back claim below so
  // triggered_text_back is never stamped true for a text that was skipped —
  // the call is still recorded, with an audit trail instead of a message.
  const skipReason =
    business?.subscription_status === "canceled"
      ? "subscription_canceled"
      : existingLead?.status === "closed_lost"
        ? "customer_opted_out"
        : null;
  if (skipReason) {
    let skippedCallId: string | null = null;
    if (callSid) {
      await db.from("calls").upsert(
        { business_id: businessId, lead_id: leadId, twilio_call_sid: callSid, status },
        { onConflict: "twilio_call_sid", ignoreDuplicates: true },
      );
      const { data: callRow } = await db
        .from("calls")
        .select("id")
        .eq("business_id", businessId)
        .eq("twilio_call_sid", callSid)
        .maybeSingle();
      skippedCallId = callRow?.id ?? null;
    }
    await db.from("audit_log").insert({
      business_id: businessId,
      actor_type: "system",
      event_type: "missed_call_text_back_skipped",
      entity_type: "call",
      entity_id: skippedCallId,
      metadata: { caller_phone: callerPhone, reason: skipReason },
    });
    return;
  }

  // Twilio retries callbacks on timeouts — never double-text a caller.
  // Check-then-act races, so claim atomically instead: guarantee the calls
  // row exists (insert-or-ignore), then flip triggered_text_back
  // false→true in a single conditional UPDATE. Exactly one invocation gets
  // the row back and proceeds to send the text; the rest return here.
  let callId: string | null = null;
  if (callSid) {
    await db.from("calls").upsert(
      { business_id: businessId, lead_id: leadId, twilio_call_sid: callSid, status },
      { onConflict: "twilio_call_sid", ignoreDuplicates: true },
    );
    const { data: claimed } = await db
      .from("calls")
      .update({
        triggered_text_back: true,
        status,
        lead_id: leadId,
        ended_at: new Date().toISOString(),
      })
      .eq("business_id", businessId)
      .eq("twilio_call_sid", callSid)
      .eq("triggered_text_back", false)
      .select("id");
    if (!claimed?.length) return;
    callId = claimed[0].id;
  } else {
    // No CallSid means there's nothing to dedup on (Twilio always sends
    // one in practice) — just record the call and proceed.
    const { data: inserted } = await db
      .from("calls")
      .insert({
        business_id: businessId,
        lead_id: leadId,
        twilio_call_sid: null,
        status,
        triggered_text_back: true,
        ended_at: new Date().toISOString(),
      })
      .select("id")
      .maybeSingle();
    callId = inserted?.id ?? null;
  }

  const conversationId = await resolveConversationId(businessId, leadId);

  // Lead language is only known from a previous conversation; a brand-new
  // caller gets English. Opt-out notice is baked into the opener string.
  const openerText = missedCallOpener(businessName, existingLead?.language ? toCustomerLang(existingLead.language) : "en");

  let messageStatus: "sent" | "failed" = "sent";
  let messageSid: string | null = null;
  try {
    messageSid = await sendSms({ to: callerPhone, from: businessPhone, body: openerText });
  } catch {
    messageStatus = "failed";
  }

  await db.from("messages").insert({
    conversation_id: conversationId,
    business_id: businessId,
    direction: "outbound",
    sender: "ai",
    body: openerText,
    status: messageStatus,
    twilio_message_sid: messageSid,
  });

  await db
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);

  await db.from("audit_log").insert({
    business_id: businessId,
    actor_type: "system",
    event_type: "missed_call_text_back_triggered",
    entity_type: "call",
    entity_id: callId,
    metadata: {
      caller_phone: callerPhone,
      call_status: status,
      conversation_id: conversationId,
      text_back_status: messageStatus,
    },
  });
}

async function resolveConversationId(businessId: string, leadId: string): Promise<string> {
  const db = createServiceClient();

  // Reuse the latest still-open thread for this lead; closed and booked
  // conversations stay closed — the opener starts a fresh thread after either.
  const { data: openConversation } = await db
    .from("conversations")
    .select("id")
    .eq("business_id", businessId)
    .eq("lead_id", leadId)
    .not("status", "in", "(closed,booked)")
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (openConversation) return openConversation.id;

  const { data: business } = await db.from("businesses").select("control_mode").eq("id", businessId).single();
  const { data: created, error } = await db
    .from("conversations")
    .insert({
      business_id: businessId,
      lead_id: leadId,
      control_mode_snapshot: (business?.control_mode as ControlMode) ?? "draft",
    })
    .select("id")
    .single();
  if (error || !created) throw new Error(error?.message ?? "Failed to create conversation");
  return created.id;
}
