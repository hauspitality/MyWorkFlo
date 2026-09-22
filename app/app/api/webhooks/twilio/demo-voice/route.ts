import { normalizePhoneE164, sendSms } from "@/lib/twilio/client";
import { gateTwilioWebhook, twiml } from "@/lib/twilio/webhook";
import { demoTextBack, trialUrl } from "@/lib/demo/demo-strings";
import { isOptedOut, recordDemoLead } from "@/lib/demo/capture";

/**
 * Inbound voice webhook for the DEMO number only. This is the "call this
 * number, hang up, watch your phone" theater from the landing tool: the
 * prospect calls, we don't bridge anywhere — we text their caller-ID number
 * the sample missed-call reply (the real product moment) and hang up.
 *
 * Wire the demo Twilio number's Voice webhook to this route. Keep it OFF any
 * real business line — the production inbound handler is
 * app/api/webhooks/twilio/voice, which matches a business by its number.
 */

export async function POST(request: Request) {
  const gate = await gateTwilioWebhook(request);
  if (gate.reject) return gate.reject;

  const from = normalizePhoneE164(gate.params.From ?? "");
  const fromNumber = process.env.NEXT_PUBLIC_DEMO_PHONE_NUMBER || process.env.TWILIO_PHONE_NUMBER;

  const spoken =
    "Thanks for calling the My Work Flo demo. Check your phone — we just sent you the text your customers get when you miss a call. Start your free trial at my work flo dot com.";

  // Caller ID blocked, or no number to send from → just speak the pitch.
  if (from && fromNumber && !(await isOptedOut(from))) {
    try {
      const sid = await sendSms({ to: from, from: fromNumber, body: demoTextBack({ trialUrl: trialUrl() }) });
      await recordDemoLead({ phone: from, channel: "inbound_call", status: "sent", twilioMessageSid: sid });
    } catch (err) {
      console.error("[twilio/demo-voice] text-back failed", err);
      await recordDemoLead({ phone: from, channel: "inbound_call", status: "failed" });
    }
  }

  return twiml(`<Response><Say>${spoken}</Say><Hangup/></Response>`);
}
