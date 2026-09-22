import "server-only";
import { validateTwilioSignature } from "@/lib/twilio/client";

/**
 * Shared plumbing for the Twilio webhook routes: form parsing, signature
 * gating, and TwiML responses. Every Twilio webhook is a public POST
 * endpoint — the signature check is the only authentication.
 */

export function twiml(xml = "<Response></Response>"): Response {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>${xml}`, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Public origin for absolute callback URLs (Twilio needs absolute action URLs). */
export function appBaseUrl(request: Request): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin).replace(/\/$/, "");
}

// Twilio signs the URL it requested (public https origin). Behind a proxy,
// request.url can carry the internal host, so rebuild the origin from
// NEXT_PUBLIC_APP_URL while keeping path + query.
function externalUrl(request: Request): string {
  const url = new URL(request.url);
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (base) {
    const origin = new URL(base);
    url.protocol = origin.protocol;
    url.host = origin.host;
    // origin.port is "" on default ports — this clears an internal port
    // (e.g. :3000) that url.host alone leaves behind; explicit public ports
    // already ride in origin.host.
    url.port = origin.port;
  }
  return url.toString();
}

/**
 * Parse the form-encoded body and validate X-Twilio-Signature. Returns
 * either a reject Response (503 when TWILIO_AUTH_TOKEN is unset, 403 on a
 * bad signature) or the parsed params.
 */
export async function gateTwilioWebhook(
  request: Request,
): Promise<{ reject: Response; params: null } | { reject: null; params: Record<string, string> }> {
  if (!process.env.TWILIO_AUTH_TOKEN) {
    return { reject: new Response("Twilio not configured", { status: 503 }), params: null };
  }

  const form = await request.formData();
  const params: Record<string, string> = {};
  for (const [name, value] of form.entries()) {
    if (typeof value === "string") params[name] = value;
  }

  const signature = request.headers.get("x-twilio-signature");
  if (!signature || !validateTwilioSignature({ url: externalUrl(request), params, signature })) {
    return { reject: new Response("Invalid signature", { status: 403 }), params: null };
  }

  return { reject: null, params };
}
