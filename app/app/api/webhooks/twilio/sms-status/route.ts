import { createServiceClient } from "@/lib/supabase/service";
import { gateTwilioWebhook, twiml } from "@/lib/twilio/webhook";

/**
 * Twilio message status callback: mirror delivery outcomes onto our
 * messages rows. Only terminal statuses matter — intermediate ones
 * (queued/sending/sent) are ignored.
 */

export async function POST(request: Request) {
  const gate = await gateTwilioWebhook(request);
  if (gate.reject) return gate.reject;

  const messageSid = gate.params.MessageSid ?? "";
  const messageStatus = gate.params.MessageStatus ?? "";
  if (!messageSid) return twiml();

  const mapped =
    messageStatus === "delivered" ? "delivered" : messageStatus === "failed" || messageStatus === "undelivered" ? "failed" : null;
  if (!mapped) return twiml();

  const db = createServiceClient();

  // Outbound status callbacks carry From = the business's Twilio number;
  // scope by business when it resolves, else fall back to the sid alone
  // (Twilio sids are globally unique and the request is signature-verified).
  const from = gate.params.From ?? "";
  const { data: business } = from
    ? await db.from("businesses").select("id").eq("twilio_phone_number", from).maybeSingle()
    : { data: null };

  let update = db.from("messages").update({ status: mapped }).eq("twilio_message_sid", messageSid);
  if (business) update = update.eq("business_id", business.id);
  await update;

  return twiml();
}
