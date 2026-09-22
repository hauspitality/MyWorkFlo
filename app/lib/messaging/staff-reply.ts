"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isTwilioConfigured, sendSms } from "@/lib/twilio/client";

/**
 * Staff actions on a single conversation: reply in-app and mark resolved.
 * Auth follows the approvals pattern (lib/approvals/actions.ts): the row is
 * fetched with the service client (its business_id is needed before we know
 * the caller may see it), then the caller must prove active-staff membership
 * of that business via the session client before anything is written.
 */

interface ActionResult {
  ok: boolean;
  error?: string;
}

interface AuthorizedContext {
  db: ReturnType<typeof createServiceClient>;
  staffId: string;
  businessId: string;
  conversation: { id: string; business_id: string; lead_id: string; status: string };
}

async function authorizeStaff(conversationId: string): Promise<{ ctx?: AuthorizedContext; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out. Sign in and try again." };

  const db = createServiceClient();
  const { data: conversation } = await db
    .from("conversations")
    .select("id, business_id, lead_id, status")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conversation) return { error: "This conversation could not be found." };

  const { data: staff } = await supabase
    .from("staff")
    .select("id")
    .eq("business_id", conversation.business_id)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (!staff) return { error: "You don't have access to this conversation." };

  return { ctx: { db, staffId: staff.id, businessId: conversation.business_id, conversation } };
}

function revalidateLeadScreens() {
  // Covers the lead detail page, the leads list, and the Home cards/badges.
  revalidatePath("/dashboard/leads", "layout");
  revalidatePath("/dashboard", "layout");
}

/**
 * Send a staff-typed text to the customer from the business's Twilio number.
 * Without Twilio configured (dev), the reply is still persisted as sent —
 * the same convention as approving a drafted message — and the audit row
 * records that delivery was skipped.
 */
export async function sendStaffReplyAction(conversationId: string, body: string): Promise<ActionResult> {
  const text = body.trim();
  if (!text) return { ok: false, error: "Type a message before sending." };
  if (text.length > 1600) return { ok: false, error: "That message is too long for a text. Try trimming it down." };

  const { ctx, error } = await authorizeStaff(conversationId);
  if (!ctx) return { ok: false, error };
  const { db, staffId, businessId, conversation } = ctx;

  const { data: lead } = await db
    .from("leads")
    .select("id, status, source_phone_number")
    .eq("id", conversation.lead_id)
    .eq("business_id", businessId)
    .maybeSingle();
  if (!lead) return { ok: false, error: "Could not find the customer for this conversation." };

  // Opt-out is sacred: closed_lost marks a customer who asked us to stop.
  if (lead.status === "closed_lost") {
    return { ok: false, error: "This customer asked us to stop texting them, so this reply was not sent." };
  }

  const { data: business } = await db.from("businesses").select("twilio_phone_number").eq("id", businessId).maybeSingle();

  let sid: string | null = null;
  let sendError: string | null = null;
  const twilioConfigured = isTwilioConfigured();
  if (twilioConfigured) {
    try {
      sid = await sendSms({ to: lead.source_phone_number, from: business?.twilio_phone_number ?? undefined, body: text });
    } catch (err) {
      sendError = err instanceof Error ? err.message : "The text could not be sent.";
    }
  }

  const { data: message, error: insertError } = await db
    .from("messages")
    .insert({
      conversation_id: conversationId,
      business_id: businessId,
      direction: "outbound",
      sender: "staff",
      body: text,
      status: sendError ? "failed" : "sent",
      twilio_message_sid: sid,
    })
    .select("id")
    .single();
  if (insertError || !message) return { ok: false, error: "Something went wrong saving your reply. Try again." };

  if (!sendError) {
    await db
      .from("conversations")
      .update({ status: "active", last_message_at: new Date().toISOString() })
      .eq("id", conversationId)
      .eq("business_id", businessId);
  }

  await db.from("audit_log").insert({
    business_id: businessId,
    actor_type: "staff",
    actor_id: staffId,
    event_type: "staff_reply_sent",
    entity_type: "message",
    entity_id: message.id,
    metadata: {
      conversation_id: conversationId,
      delivery: sendError ? "failed" : twilioConfigured ? "twilio" : "skipped_twilio_not_configured",
      ...(sendError ? { error: sendError } : {}),
    },
  });

  revalidateLeadScreens();
  if (sendError) {
    return { ok: false, error: "The text didn't go through — it's saved in the thread as failed. Try again in a moment." };
  }
  return { ok: true };
}

/**
 * Close the conversation itself. The lead's status is left untouched on
 * purpose: closed_lost is reserved for opt-outs, and there is no generic
 * "closed" value in the lead_status enum for a happy ending.
 */
export async function markConversationResolvedAction(conversationId: string): Promise<ActionResult> {
  const { ctx, error } = await authorizeStaff(conversationId);
  if (!ctx) return { ok: false, error };
  const { db, staffId, businessId, conversation } = ctx;

  if (conversation.status === "closed") return { ok: true };

  const { error: updateError } = await db
    .from("conversations")
    .update({ status: "closed", closed_reason: "resolved_by_staff" })
    .eq("id", conversationId)
    .eq("business_id", businessId);
  if (updateError) return { ok: false, error: "Something went wrong closing this conversation. Try again." };

  await db.from("audit_log").insert({
    business_id: businessId,
    actor_type: "staff",
    actor_id: staffId,
    event_type: "conversation_closed",
    entity_type: "conversation",
    entity_id: conversationId,
    metadata: { previous_status: conversation.status, reason: "resolved_by_staff" },
  });

  revalidateLeadScreens();
  return { ok: true };
}
