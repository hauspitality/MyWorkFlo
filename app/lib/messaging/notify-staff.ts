import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { isTwilioConfigured, sendSms } from "@/lib/twilio/client";
import { sendPushToBusiness, type PushPayload } from "@/lib/push/send";

/**
 * Best-effort staff alerting (web push + SMS to every active staff phone).
 * Never throws — a notification failure must not break the flow that
 * triggered it — but every failure is written to audit_log, never silent.
 * Used by the message pipeline (approvals, emergencies) and the approval
 * expiry sweeper.
 */
export async function notifyBusinessStaff(params: {
  businessId: string;
  businessTwilioNumber?: string | null;
  smsText: string;
  push: PushPayload;
}): Promise<void> {
  const { businessId, businessTwilioNumber, smsText, push } = params;
  const db = createServiceClient();

  async function audit(eventType: string, entityType: string, entityId: string | null, metadata: Record<string, unknown>) {
    await db.from("audit_log").insert({
      business_id: businessId,
      actor_type: "system",
      event_type: eventType,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
    });
  }

  try {
    await sendPushToBusiness(businessId, push);
  } catch (err) {
    await audit("staff_push_failed", "business", businessId, { error: err instanceof Error ? err.message : "push failed" });
  }

  if (!isTwilioConfigured()) return;
  const { data: staffRows } = await db
    .from("staff")
    .select("id, phone_number")
    .eq("business_id", businessId)
    .eq("is_active", true);
  for (const staff of staffRows ?? []) {
    try {
      await sendSms({ to: staff.phone_number, from: businessTwilioNumber ?? undefined, body: smsText });
    } catch (err) {
      await audit("staff_sms_failed", "staff", staff.id, { error: err instanceof Error ? err.message : "sms failed" });
    }
  }
}
