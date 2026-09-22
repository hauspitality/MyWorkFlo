import { createServiceClient } from "@/lib/supabase/service";
import { recordMissedCallAndTextBack } from "@/lib/twilio/missed-call";
import { gateTwilioWebhook, twiml } from "@/lib/twilio/webhook";
import type { CallStatus } from "@/lib/supabase/types";

/**
 * <Dial> action callback from the voice webhook. A missed dial (owner
 * didn't pick up / busy / failed) triggers the missed-call text-back; an
 * answered dial just records a completed call. Always 200 TwiML — for a
 * missed dial the caller is still on the line, so tell them a text is
 * coming before hanging up.
 */

// call_status enum has no "failed"; a failed dial is a missed call.
const MISSED_STATUS: Record<string, CallStatus> = {
  "no-answer": "no-answer",
  busy: "busy",
  failed: "no-answer",
};

export async function POST(request: Request) {
  const gate = await gateTwilioWebhook(request);
  if (gate.reject) return gate.reject;

  const from = gate.params.From ?? "";
  const to = gate.params.To ?? "";
  const callSid = gate.params.CallSid ?? null;
  const dialStatus = gate.params.DialCallStatus ?? "";

  const db = createServiceClient();
  const { data: business } = await db
    .from("businesses")
    .select("id, name")
    .eq("twilio_phone_number", to)
    .maybeSingle();
  if (!business) return twiml();

  const missedStatus = MISSED_STATUS[dialStatus];

  if (missedStatus && from) {
    try {
      await recordMissedCallAndTextBack({
        businessId: business.id,
        businessName: business.name,
        businessPhone: to,
        callerPhone: from,
        callSid,
        status: missedStatus,
      });
    } catch (err) {
      console.error("[twilio/voice-status] text-back failed", err);
    }
    return twiml(
      `<Response><Say>Sorry we missed you. We're sending you a text — reply there and we'll get you scheduled.</Say><Hangup/></Response>`,
    );
  }

  // Answered (or anything not a miss): record the completed call.
  await db.from("calls").upsert(
    {
      business_id: business.id,
      twilio_call_sid: callSid,
      status: "completed",
      ended_at: new Date().toISOString(),
    },
    { onConflict: "twilio_call_sid" },
  );

  return twiml();
}
