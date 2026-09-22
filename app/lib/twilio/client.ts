import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Minimal Twilio REST client — fetch + Basic auth against the 2010-04-01
 * API, no SDK. Env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
 * TWILIO_PHONE_NUMBER.
 */

const TWILIO_API_BASE = "https://api.twilio.com/2010-04-01";

export function isTwilioConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER,
  );
}

/**
 * Normalize a free-text US phone number to E.164: "(555) 123-4567",
 * "555-123-4567", "1 555 123 4567", and "+15551234567" all become
 * "+15551234567". Returns null when the input isn't a plausible US number.
 */
export function normalizePhoneE164(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (raw.trim().startsWith("+")) return digits ? `+${digits}` : null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

/**
 * Send an SMS via the Twilio REST API. Returns the message sid. Throws on
 * missing config or a non-2xx response — callers decide how to degrade
 * (e.g. mark the message row "failed" instead of crashing a webhook).
 */
export async function sendSms(params: { to: string; from?: string; body: string }): Promise<string | null> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = params.from ?? process.env.TWILIO_PHONE_NUMBER;
  if (!accountSid || !authToken || !from) {
    throw new Error("Twilio is not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER)");
  }

  const form = new URLSearchParams({ To: params.to, From: from, Body: params.body });
  // Delivery-status callbacks (app/api/webhooks/twilio/sms-status) only
  // arrive if each message requests them.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) form.set("StatusCallback", `${appUrl.replace(/\/$/, "")}/api/webhooks/twilio/sms-status`);

  const response = await fetch(`${TWILIO_API_BASE}/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Twilio send failed (${response.status}): ${detail.slice(0, 300)}`);
  }

  const data = (await response.json()) as { sid?: string };
  return data.sid ?? null;
}

/**
 * Validate an X-Twilio-Signature header per Twilio's scheme: append each
 * POST param (name + value, names sorted alphabetically) to the full
 * request URL, HMAC-SHA1 with the auth token, base64. Timing-safe compare.
 */
export function validateTwilioSignature(params: {
  url: string;
  params: Record<string, string>;
  signature: string;
}): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return false;

  let payload = params.url;
  for (const name of Object.keys(params.params).sort()) {
    payload += name + params.params[name];
  }

  const expected = createHmac("sha1", authToken).update(payload, "utf8").digest();
  const provided = Buffer.from(params.signature, "base64");
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}
