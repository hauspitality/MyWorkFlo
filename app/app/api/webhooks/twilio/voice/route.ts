import { createServiceClient } from "@/lib/supabase/service";
import { recordMissedCallAndTextBack } from "@/lib/twilio/missed-call";
import { appBaseUrl, escapeXml, gateTwilioWebhook, twiml } from "@/lib/twilio/webhook";

/**
 * Twilio inbound voice webhook. Bridges the caller to the business owner's
 * cell (<Dial> with a 20s timeout; the action callback at voice-status
 * handles the missed-call text-back). If the business has no active owner
 * with a phone, apologize, hang up, and trigger the text-back immediately.
 */

export async function POST(request: Request) {
  const gate = await gateTwilioWebhook(request);
  if (gate.reject) return gate.reject;

  const from = gate.params.From ?? "";
  const to = gate.params.To ?? "";
  const callSid = gate.params.CallSid ?? null;

  const db = createServiceClient();
  const { data: business } = await db
    .from("businesses")
    .select("id, name")
    .eq("twilio_phone_number", to)
    .maybeSingle();
  if (!business) return twiml("<Response><Hangup/></Response>");

  const { data: owner } = await db
    .from("staff")
    .select("phone_number")
    .eq("business_id", business.id)
    .eq("role", "owner")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (owner?.phone_number) {
    const action = `${appBaseUrl(request)}/api/webhooks/twilio/voice-status`;
    return twiml(
      `<Response><Dial timeout="20" answerOnBridge="true" action="${escapeXml(action)}">` +
        `<Number>${escapeXml(owner.phone_number)}</Number>` +
        `</Dial></Response>`,
    );
  }

  // No one to bridge to — the text-back is the front desk.
  if (from) {
    try {
      await recordMissedCallAndTextBack({
        businessId: business.id,
        businessName: business.name,
        businessPhone: to,
        callerPhone: from,
        callSid,
        status: "no-answer",
      });
    } catch (err) {
      console.error("[twilio/voice] text-back failed", err);
    }
  }

  return twiml(
    `<Response><Say>Sorry, we can't take your call right now. We're sending you a text — reply there and we'll get you scheduled.</Say><Hangup/></Response>`,
  );
}
