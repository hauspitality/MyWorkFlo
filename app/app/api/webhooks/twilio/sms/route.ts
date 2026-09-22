import { createServiceClient } from "@/lib/supabase/service";
import { processInboundMessage } from "@/lib/messaging/process-inbound";
import { resolveApproval } from "@/lib/approvals/resolve";
import { normalizePhoneE164, sendSms } from "@/lib/twilio/client";
import { gateTwilioWebhook, twiml } from "@/lib/twilio/webhook";

/**
 * Twilio inbound SMS webhook. Two personas text a business's number:
 *
 * - A staff member replying YES/NO to a pending approval → resolveApproval
 *   plus a confirmation text back to the staffer.
 * - A customer → the production pipeline (processInboundMessage), which
 *   sends any outbound via the REST API through `deliver`.
 *
 * The TwiML response is always an empty <Response> — outbound goes via
 * REST, never a TwiML reply, because control modes may send zero messages.
 */

const APPROVE_WORDS = new Set(["yes", "y", "1", "approve", "ok", "si", "sí"]);
const DECLINE_WORDS = new Set(["no", "n", "2", "decline", "reject"]);

function parseApprovalReply(body: string): boolean | null {
  const normalized = body.trim().toLowerCase().replace(/[.!?]+$/, "");
  if (APPROVE_WORDS.has(normalized)) return true;
  if (DECLINE_WORDS.has(normalized)) return false;
  return null;
}

export async function POST(request: Request) {
  const gate = await gateTwilioWebhook(request);
  if (gate.reject) return gate.reject;

  const from = gate.params.From ?? "";
  const to = gate.params.To ?? "";
  const body = gate.params.Body ?? "";
  if (!from || !to) return twiml();

  const db = createServiceClient();
  const { data: business } = await db
    .from("businesses")
    .select("id, name")
    .eq("twilio_phone_number", to)
    .maybeSingle();
  // Unknown number: 200 TwiML no-op so Twilio doesn't retry.
  if (!business) return twiml();

  // Staffer replies never reach a Twilio error even when Twilio send-back
  // fails — the approval resolution itself is what matters.
  const deliverToStaff = async (text: string) => {
    try {
      await sendSms({ to: from, from: to, body: text });
    } catch {
      // Confirmation text is best-effort.
    }
  };

  // staff.phone_number is free text ("(555) 123-4567"), while Twilio's From
  // is E.164 — normalize both sides before comparing, or staff texts fall
  // through to the customer pipeline and become AI leads.
  const normalizedFrom = normalizePhoneE164(from);
  const { data: staffRows } = await db
    .from("staff")
    .select("id, name, phone_number")
    .eq("business_id", business.id)
    .eq("is_active", true);
  const staffRow = normalizedFrom
    ? ((staffRows ?? []).find((s) => normalizePhoneE164(s.phone_number) === normalizedFrom) ?? null)
    : null;

  if (staffRow) {
    const { data: pendingRows } = await db
      .from("approval_queue")
      .select("id")
      .eq("business_id", business.id)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("requested_at", { ascending: true })
      .limit(2);

    // A bare YES/NO can't say which item it means when several are pending
    // — never resolve one by guessing; send the staffer to the dashboard
    // (or each approval's own magic link) instead.
    if ((pendingRows?.length ?? 0) > 1) {
      await deliverToStaff(
        "Multiple approvals are pending, so a YES/NO here is ambiguous. Use the dashboard or each approval's link to resolve them individually.",
      );
      return twiml();
    }

    const pending = pendingRows?.[0];
    if (pending) {
      const approve = parseApprovalReply(body);
      if (approve === null) {
        await deliverToStaff("Reply YES to approve or NO to decline.");
        return twiml();
      }

      const result = await resolveApproval({
        approvalId: pending.id,
        approve,
        respondedBy: staffRow.id,
        responseChannel: "sms_reply",
      });

      await db.from("audit_log").insert({
        business_id: business.id,
        actor_type: "system",
        event_type: "staff_sms_approval_processed",
        entity_type: "approval_queue",
        entity_id: pending.id,
        metadata: {
          approved: approve,
          ok: result.ok,
          ...(result.error ? { error: result.error } : {}),
          staff_id: staffRow.id,
        },
      });

      const confirmation = result.ok
        ? approve
          ? "Got it — approved."
          : "Got it — declined."
        : `Couldn't process that: ${result.error ?? "unknown error"}. Use the dashboard to resolve it.`;
      await deliverToStaff(confirmation);
      return twiml();
    }
  }

  try {
    await processInboundMessage({
      businessId: business.id,
      fromPhone: from,
      body,
      // MessageSid makes a Twilio retry idempotent — the pipeline inserts
      // the inbound first and short-circuits on the unique violation.
      inboundSid: gate.params.MessageSid ?? null,
      deliver: (text) => sendSms({ to: from, from: to, body: text }),
    });
  } catch (err) {
    // 200 anyway: a Twilio retry would re-run the AI turn and duplicate
    // messages; the failure is surfaced via logs instead.
    console.error("[twilio/sms] pipeline failed", err);
  }

  return twiml();
}
