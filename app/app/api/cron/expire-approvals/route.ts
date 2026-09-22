import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isTwilioConfigured, sendSms } from "@/lib/twilio/client";
import { notifyBusinessStaff } from "@/lib/messaging/notify-staff";

/**
 * Vercel Cron (every 5 min, see vercel.json): sweeps pending approvals past
 * their expiry. Per the plan: the row is marked auto_expired (audit trail —
 * expired approvals must never just vanish from pending queries), the
 * customer gets a fallback text so they aren't left hanging, staff get a
 * second, more urgent nudge, and the conversation escalates to a human.
 *
 * Vercel sends Authorization: Bearer <CRON_SECRET> automatically when the
 * CRON_SECRET env var is set on the project.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();
  const nowIso = new Date().toISOString();

  const { data: expired } = await db
    .from("approval_queue")
    .select("id, business_id, conversation_id, type")
    .eq("status", "pending")
    .lt("expires_at", nowIso)
    .limit(50);

  let swept = 0;
  for (const approval of expired ?? []) {
    // Atomic claim: only the invocation that flips pending→auto_expired
    // handles the side effects (cron runs can overlap).
    const { data: claimed } = await db
      .from("approval_queue")
      .update({ status: "auto_expired", responded_at: nowIso })
      .eq("id", approval.id)
      .eq("status", "pending")
      .select("id");
    if (!claimed?.length) continue;
    swept++;

    const { data: conversation } = await db
      .from("conversations")
      .select("id, lead_id, businesses(name, twilio_phone_number), leads(source_phone_number)")
      .eq("id", approval.conversation_id)
      .single();
    const businessRow = Array.isArray(conversation?.businesses) ? conversation?.businesses[0] : conversation?.businesses;
    const leadRow = Array.isArray(conversation?.leads) ? conversation?.leads[0] : conversation?.leads;

    await db.from("conversations").update({ status: "escalated_priority" }).eq("id", approval.conversation_id);
    await db.from("leads").update({ status: "escalated" }).eq("id", conversation?.lead_id ?? "");

    // Customer fallback so they aren't left waiting on an approval that
    // never came.
    const fallbackText = "Thanks for your patience — a team member is going to follow up with you directly shortly.";
    let fallbackStatus: "sent" | "failed" = "sent";
    let fallbackSid: string | null = null;
    if (isTwilioConfigured() && leadRow?.source_phone_number) {
      try {
        fallbackSid = await sendSms({
          to: leadRow.source_phone_number,
          from: businessRow?.twilio_phone_number ?? undefined,
          body: fallbackText,
        });
      } catch {
        fallbackStatus = "failed";
      }
    }
    await db.from("messages").insert({
      conversation_id: approval.conversation_id,
      business_id: approval.business_id,
      direction: "outbound",
      sender: "ai",
      body: fallbackText,
      status: fallbackStatus,
      twilio_message_sid: fallbackSid,
    });

    await notifyBusinessStaff({
      businessId: approval.business_id,
      businessTwilioNumber: businessRow?.twilio_phone_number,
      smsText: `URGENT: an approval for ${leadRow?.source_phone_number ?? "a customer"} expired unanswered. They were told someone will follow up — that someone is you: ${process.env.NEXT_PUBLIC_APP_URL ?? ""}/dashboard/approvals`,
      push: {
        title: "Approval expired — customer waiting",
        body: `${leadRow?.source_phone_number ?? "A customer"} needs a human follow-up now.`,
        url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/dashboard/leads/${approval.conversation_id}`,
      },
    });

    await db.from("audit_log").insert({
      business_id: approval.business_id,
      actor_type: "system",
      event_type: "approval_auto_expired",
      entity_type: "approval",
      entity_id: approval.id,
      metadata: { approval_type: approval.type, conversation_id: approval.conversation_id },
    });
  }

  return NextResponse.json({ swept });
}
