import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { sendSms, isTwilioConfigured } from "@/lib/twilio/client";
import { createCalendarEventIfConnected } from "@/lib/calendar/google";
import type { ResponseChannel } from "@/lib/supabase/types";

/**
 * The one place a pending approval_queue row gets resolved, shared by every
 * entry point — dashboard buttons, the unauthenticated magic-link page, and
 * the SMS "reply YES/NO" webhook. Callers do their own authorization (or
 * hold the magic-link token, which IS the authorization); this module does
 * the state transition and its side effects with the service client.
 */

export interface ResolveApprovalParams {
  approvalId: string;
  approve: boolean;
  /** staff.id of the resolver, when known (dashboard). */
  respondedBy?: string | null;
  /** null = dashboard resolution — "dashboard" is not in the response_channel enum and the column is nullable. */
  responseChannel: ResponseChannel | null;
}

export interface ResolveApprovalResult {
  ok: boolean;
  error?: string;
}

export async function resolveApproval(params: ResolveApprovalParams): Promise<ResolveApprovalResult> {
  const { approvalId, approve, responseChannel } = params;
  const respondedBy = params.respondedBy ?? null;
  const db = createServiceClient();

  const { data: approval } = await db
    .from("approval_queue")
    .select("id, business_id, conversation_id, type, status, payload, expires_at")
    .eq("id", approvalId)
    .maybeSingle();
  if (!approval) return { ok: false, error: "Approval not found" };
  if (approval.status !== "pending") return { ok: false, error: "This request was already resolved" };
  if (new Date(approval.expires_at).getTime() <= Date.now()) return { ok: false, error: "This request has expired" };

  const businessId: string = approval.business_id;
  const conversationId: string = approval.conversation_id;
  const payload = (approval.payload ?? {}) as Record<string, unknown>;

  // Validate executable payloads BEFORE claiming: a claim consumed by a
  // payload that can never execute would permanently burn the approval.
  if (approve && approval.type === "booking") {
    const appointmentTypeId = typeof payload.appointment_type_id === "string" ? payload.appointment_type_id : null;
    const startIso = typeof payload.start === "string" ? payload.start : null;
    if (!appointmentTypeId || !startIso) return { ok: false, error: "Approval payload is missing booking details" };
    if (Number.isNaN(new Date(startIso).getTime())) return { ok: false, error: "Approval payload has an invalid start time" };
  }

  // Claim atomically: the status=pending guard makes concurrent resolutions
  // (dashboard vs. magic link vs. SMS reply) settle exactly once.
  const claimedStatus = approve ? "approved" : "rejected";
  const { data: claimed } = await db
    .from("approval_queue")
    .update({
      status: claimedStatus,
      responded_at: new Date().toISOString(),
      responded_by: respondedBy,
      response_channel: responseChannel,
    })
    .eq("id", approvalId)
    .eq("status", "pending")
    .select("id");
  if (!claimed?.length) return { ok: false, error: "This request was already resolved" };

  async function audit(eventType: string, entityType: string, entityId: string | null, metadata: Record<string, unknown>) {
    await db.from("audit_log").insert({
      business_id: businessId,
      actor_type: "staff",
      actor_id: respondedBy,
      event_type: eventType,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
    });
  }

  // A post-claim side-effect failure must not consume the approval: un-claim
  // it so it stays retryable from any channel. The status guard mirrors the
  // claim so we never clobber a resolution that landed in the meantime.
  async function revertClaim(error: string): Promise<ResolveApprovalResult> {
    await db
      .from("approval_queue")
      .update({ status: "pending", responded_at: null, responded_by: null, response_channel: null })
      .eq("id", approvalId)
      .eq("status", claimedStatus);
    await audit("approval_execution_failed", "approval", approvalId, {
      approval_type: approval?.type,
      response_channel: responseChannel,
      error,
    });
    return { ok: false, error };
  }

  if (!approve) {
    const messageId = typeof payload.message_id === "string" ? payload.message_id : null;
    if (approval.type === "outbound_message" && messageId) {
      await db.from("messages").update({ status: "failed" }).eq("id", messageId).eq("business_id", businessId);
    }
    await db.from("conversations").update({ status: "active" }).eq("id", conversationId).eq("business_id", businessId);
    await audit("approval_declined", "approval", approvalId, { approval_type: approval.type, response_channel: responseChannel });
    return { ok: true };
  }

  if (approval.type === "outbound_message") {
    return approveOutboundMessage();
  }
  if (approval.type === "booking") {
    return approveBooking();
  }

  // emergency_escalation / other_exception carry no executable payload yet —
  // resolving them just unblocks the conversation.
  await db.from("conversations").update({ status: "active" }).eq("id", conversationId).eq("business_id", businessId);
  await audit("approval_approved", "approval", approvalId, { approval_type: approval.type, response_channel: responseChannel });
  return { ok: true };

  async function loadLead(): Promise<{ id: string; name: string | null; source_phone_number: string } | null> {
    const { data: convo } = await db
      .from("conversations")
      .select("lead_id")
      .eq("id", conversationId)
      .eq("business_id", businessId)
      .maybeSingle();
    if (!convo) return null;
    const { data: lead } = await db
      .from("leads")
      .select("id, name, source_phone_number")
      .eq("id", convo.lead_id)
      .eq("business_id", businessId)
      .maybeSingle();
    return lead ?? null;
  }

  async function approveOutboundMessage(): Promise<ResolveApprovalResult> {
    const draftText = typeof payload.draft_text === "string" ? payload.draft_text : null;
    const messageId = typeof payload.message_id === "string" ? payload.message_id : null;
    if (!draftText) return revertClaim("Approval payload is missing the draft message");

    const lead = await loadLead();
    if (!lead) return revertClaim("Could not find the customer for this conversation");
    const { data: business } = await db.from("businesses").select("twilio_phone_number").eq("id", businessId).maybeSingle();

    // Without Twilio configured (dev), approving still marks the draft sent.
    let sid: string | null = null;
    let sendError: string | null = null;
    if (isTwilioConfigured()) {
      try {
        sid = await sendSms({ to: lead.source_phone_number, from: business?.twilio_phone_number ?? undefined, body: draftText });
      } catch (err) {
        sendError = err instanceof Error ? err.message : "Failed to send the message";
      }
    }

    if (messageId) {
      await db
        .from("messages")
        .update({ status: sendError ? "failed" : "sent", twilio_message_sid: sid })
        .eq("id", messageId)
        .eq("business_id", businessId);
    }
    await db.from("conversations").update({ status: "active" }).eq("id", conversationId).eq("business_id", businessId);

    if (sendError) return revertClaim(sendError);
    await audit("approval_approved_message", "message", messageId, { approval_id: approvalId, response_channel: responseChannel });
    return { ok: true };
  }

  async function approveBooking(): Promise<ResolveApprovalResult> {
    const appointmentTypeId = typeof payload.appointment_type_id === "string" ? payload.appointment_type_id : null;
    const startIso = typeof payload.start === "string" ? payload.start : null;
    if (!appointmentTypeId || !startIso) return revertClaim("Approval payload is missing booking details");

    const lead = await loadLead();
    if (!lead) return revertClaim("Could not find the customer for this conversation");

    const { data: business } = await db.from("businesses").select("timezone, twilio_phone_number").eq("id", businessId).maybeSingle();
    const { data: apptType } = await db
      .from("appointment_types")
      .select("name, duration_minutes")
      .eq("id", appointmentTypeId)
      .eq("business_id", businessId)
      .maybeSingle();

    const start = new Date(startIso);
    const end = new Date(start.getTime() + (apptType?.duration_minutes ?? 60) * 60_000);

    const { data: appointment, error: apptError } = await db
      .from("appointments")
      .insert({
        business_id: businessId,
        lead_id: lead.id,
        conversation_id: conversationId,
        appointment_type_id: appointmentTypeId,
        scheduled_start: start.toISOString(),
        scheduled_end: end.toISOString(),
        status: "confirmed",
        booked_via: "assisted_approval",
      })
      .select("id")
      .single();
    if (apptError || !appointment) return revertClaim(apptError?.message ?? "Failed to create the appointment");

    const typeName = apptType?.name ?? "Service visit";
    const googleEventId = await createCalendarEventIfConnected({
      businessId,
      summary: `${typeName} — ${lead.name ?? lead.source_phone_number}`,
      description: `Booked via MyWorkFlo staff approval. Customer: ${lead.source_phone_number}`,
      startIso: start.toISOString(),
      endIso: end.toISOString(),
    });
    if (googleEventId) {
      await db.from("appointments").update({ google_event_id: googleEventId }).eq("id", appointment.id);
    }

    await db.from("conversations").update({ status: "booked" }).eq("id", conversationId).eq("business_id", businessId);
    await db.from("leads").update({ status: "booked" }).eq("id", lead.id);

    const confirmationText = `You're booked: ${typeName} on ${formatInTimezone(start, business?.timezone)}. Reply here if you need to change anything.`;
    let sid: string | null = null;
    let messageStatus: "sent" | "failed" = "sent";
    if (isTwilioConfigured()) {
      try {
        sid = await sendSms({ to: lead.source_phone_number, from: business?.twilio_phone_number ?? undefined, body: confirmationText });
      } catch {
        // The booking itself succeeded; a failed confirmation text is
        // recorded on the message row, not surfaced as an approval error.
        messageStatus = "failed";
      }
    }
    await db.from("messages").insert({
      conversation_id: conversationId,
      business_id: businessId,
      direction: "outbound",
      sender: "ai",
      body: confirmationText,
      status: messageStatus,
      twilio_message_sid: sid,
    });

    await audit("approval_approved_booking", "appointment", appointment.id, {
      approval_id: approvalId,
      appointment_type_id: appointmentTypeId,
      start: start.toISOString(),
      response_channel: responseChannel,
    });
    return { ok: true };
  }
}

function formatInTimezone(date: Date, timezone: string | null | undefined): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  };
  try {
    return date.toLocaleString("en-US", { ...options, timeZone: timezone ?? "America/New_York" });
  } catch {
    // Invalid timezone string on the business row — fall back to UTC rather than crash the approval.
    return date.toLocaleString("en-US", { ...options, timeZone: "UTC" });
  }
}
