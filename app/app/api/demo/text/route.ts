import { NextResponse } from "next/server";
import { normalizePhoneE164, sendSms } from "@/lib/twilio/client";
import { demoTextBack, trialUrl } from "@/lib/demo/demo-strings";
import { checkRateLimit, clientIp, hashIp, isOptedOut, recordDemoLead } from "@/lib/demo/capture";

/**
 * Public, unauthenticated: send the sample missed-call text to a prospect's
 * own phone. The lead is captured either way — if no demo number is
 * provisioned yet, we still record them (status queued_no_number) and tell
 * them the truth, so the funnel works before Twilio is fully live.
 */

// The number the demo texts come from. A dedicated demo number keeps demo
// traffic off any real business line; falls back to the main Twilio number.
function demoFromNumber(): string | undefined {
  return process.env.NEXT_PUBLIC_DEMO_PHONE_NUMBER || process.env.TWILIO_PHONE_NUMBER || undefined;
}

export async function POST(request: Request) {
  let body: { phone?: unknown; businessName?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const phone = normalizePhoneE164(typeof body.phone === "string" ? body.phone : "");
  if (!phone) {
    return NextResponse.json({ ok: false, error: "Enter a valid US mobile number." }, { status: 400 });
  }
  const businessName =
    typeof body.businessName === "string" && body.businessName.trim() ? body.businessName.trim().slice(0, 80) : null;

  const ipHash = hashIp(clientIp(request.headers));
  const userAgent = request.headers.get("user-agent")?.slice(0, 300) ?? null;

  if (await isOptedOut(phone)) {
    // Honor a prior STOP without revealing whether the number is known.
    return NextResponse.json({ ok: true, sent: false, message: "You're all set." });
  }

  const rate = await checkRateLimit(phone, ipHash);
  if (!rate.ok) {
    return NextResponse.json(
      { ok: false, error: "You've already run the demo a few times — check your texts, or start a trial." },
      { status: 429 },
    );
  }

  const from = demoFromNumber();
  const masked = `(${phone.slice(2, 5)}) ${phone.slice(5, 8)}-${phone.slice(8)}`;

  // No number provisioned yet → capture the lead, tell the truth.
  if (!from || !process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    await recordDemoLead({ phone, businessName, channel: "text_form", status: "queued_no_number", ipHash, userAgent });
    return NextResponse.json({
      ok: true,
      sent: false,
      message: `You're on the list — we'll text ${masked} the sample the moment our line goes live (this week).`,
    });
  }

  try {
    const sid = await sendSms({ to: phone, from, body: demoTextBack({ businessName, trialUrl: trialUrl() }) });
    await recordDemoLead({ phone, businessName, channel: "text_form", status: "sent", twilioMessageSid: sid, ipHash, userAgent });
    return NextResponse.json({ ok: true, sent: true, message: `Sent to ${masked} — check your phone.` });
  } catch (err) {
    console.error("[demo/text] send failed", err);
    await recordDemoLead({ phone, businessName, channel: "text_form", status: "failed", ipHash, userAgent });
    return NextResponse.json(
      { ok: false, error: "We couldn't send that just now. Try again in a moment." },
      { status: 502 },
    );
  }
}
