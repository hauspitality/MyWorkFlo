import "server-only";
import { createHash } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Demo lead capture + abuse control for the public demo tool. All writes go
 * through the service client (demo_leads has RLS on with no policies).
 */

// Proportionate caps for a single self-requested demo text. Tune if abuse appears.
const MAX_PER_NUMBER_PER_DAY = 3;
const MAX_PER_IP_PER_HOUR = 6;

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const salt = process.env.DEMO_IP_SALT ?? "myworkflo-demo";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

/** First client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(headers: Headers): string | null {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers.get("x-real-ip");
}

export type RateVerdict = { ok: true } | { ok: false; reason: "number" | "ip" };

/** Returns whether a new demo-text request from this number/IP is within caps. */
export async function checkRateLimit(phone: string, ipHash: string | null): Promise<RateVerdict> {
  const db = createServiceClient();
  const now = Date.now();

  const { count: numberCount } = await db
    .from("demo_leads")
    .select("id", { count: "exact", head: true })
    .eq("phone_number", phone)
    .eq("channel", "text_form")
    .gte("created_at", new Date(now - DAY_MS).toISOString());
  if ((numberCount ?? 0) >= MAX_PER_NUMBER_PER_DAY) return { ok: false, reason: "number" };

  if (ipHash) {
    const { count: ipCount } = await db
      .from("demo_leads")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .eq("channel", "text_form")
      .gte("created_at", new Date(now - HOUR_MS).toISOString());
    if ((ipCount ?? 0) >= MAX_PER_IP_PER_HOUR) return { ok: false, reason: "ip" };
  }

  return { ok: true };
}

/** True if this number previously opted out of the demo (replied STOP). */
export async function isOptedOut(phone: string): Promise<boolean> {
  const db = createServiceClient();
  const { data } = await db
    .from("demo_leads")
    .select("id")
    .eq("phone_number", phone)
    .eq("status", "opted_out")
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

export async function recordDemoLead(params: {
  phone: string;
  businessName?: string | null;
  channel: "text_form" | "inbound_call";
  status: "sent" | "queued_no_number" | "failed" | "opted_out";
  twilioMessageSid?: string | null;
  ipHash?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  const db = createServiceClient();
  await db.from("demo_leads").insert({
    phone_number: params.phone,
    business_name: params.businessName ?? null,
    channel: params.channel,
    status: params.status,
    twilio_message_sid: params.twilioMessageSid ?? null,
    ip_hash: params.ipHash ?? null,
    user_agent: params.userAgent ?? null,
    texted_at: params.status === "sent" ? new Date().toISOString() : null,
  });
}
