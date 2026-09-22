import { createServiceClient } from "@/lib/supabase/service";
import { helpText, optInConfirmation, toCustomerLang } from "@/lib/messaging/customer-strings";
import { notifyBusinessStaff } from "@/lib/messaging/notify-staff";
import { processInboundMessage } from "@/lib/messaging/process-inbound";
import { resolveApproval } from "@/lib/approvals/resolve";
import { sendPushToBusiness } from "@/lib/push/send";
import { normalizePhoneE164, sendSms } from "@/lib/twilio/client";
import { OPT_IN_WORDS, OPT_OUT_WORDS } from "@/lib/twilio/optout";
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

// STOP/START keyword sets live in lib/twilio/optout.ts (shared, exact-match
// semantics documented there). HELP stays local — it's a reply keyword, not
// a subscription state change.
const HELP_WORDS = new Set(["help", "info"]);

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

  // staff.phone_number is free text ("(555) 123-4567"), while Twilio's From
  // is E.164 — normalize both sides before comparing, or staff texts fall
  // through to the customer pipeline and become AI leads. Resolved before
  // the compliance keywords: a STOP from a staff phone is the carrier
  // silencing their alerts, not a customer opting out.
  const normalizedFrom = normalizePhoneE164(from);
  const { data: staffRows } = await db
    .from("staff")
    .select("id, name, phone_number")
    .eq("business_id", business.id)
    .eq("is_active", true);
  const staffRow = normalizedFrom
    ? ((staffRows ?? []).find((s) => normalizePhoneE164(s.phone_number) === normalizedFrom) ?? null)
    : null;

  // STOP/START/HELP run before the approval branch and before the AI
  // pipeline — compliance keywords must never reach the model or trigger a
  // reply flow.
  const complianceWord = body.trim().toLowerCase().replace(/[.!?]+$/, "");

  if (OPT_OUT_WORDS.has(complianceWord)) {
    // A staff phone texting STOP blocks their carrier-level alerts — do NOT
    // close their (nonexistent) leads; warn the business instead, since
    // every SMS alert to this staffer will now silently drop.
    if (staffRow) {
      await db.from("audit_log").insert({
        business_id: business.id,
        actor_type: "system",
        event_type: "staff_sms_opted_out",
        entity_type: "staff",
        entity_id: staffRow.id,
        metadata: { phone: from, keyword: complianceWord },
      });
      try {
        await sendPushToBusiness(business.id, {
          title: "Staff phone opted out of SMS",
          body: `${staffRow.name}'s phone opted out of SMS — their text alerts are blocked by the carrier until they reply START`,
        });
      } catch {
        // Best-effort warning; the audit row above is the durable record.
      }
      return twiml();
    }

    const { data: optOutLeads } = await db
      .from("leads")
      .select("id")
      .eq("business_id", business.id)
      .eq("source_phone_number", from);
    const leadIds = (optOutLeads ?? []).map((l) => l.id);
    if (leadIds.length > 0) {
      await db.from("leads").update({ status: "closed_lost" }).in("id", leadIds);
      const { data: leadConvos } = await db
        .from("conversations")
        .select("id")
        .eq("business_id", business.id)
        .in("lead_id", leadIds);
      const convoIds = (leadConvos ?? []).map((c) => c.id);
      await db
        .from("conversations")
        .update({ status: "closed", closed_reason: "customer_opted_out" })
        .eq("business_id", business.id)
        .in("lead_id", leadIds)
        .neq("status", "closed");

      // Nothing may re-send to this phone later: pending approvals for its
      // conversations die with the opt-out (a staff YES or the expiry
      // sweeper would otherwise text an opted-out customer).
      if (convoIds.length > 0) {
        const { data: rejected } = await db
          .from("approval_queue")
          .update({ status: "rejected", responded_at: new Date().toISOString() })
          .eq("business_id", business.id)
          .eq("status", "pending")
          .in("conversation_id", convoIds)
          .select("id");
        for (const row of rejected ?? []) {
          await db.from("audit_log").insert({
            business_id: business.id,
            actor_type: "system",
            event_type: "approval_auto_rejected_opt_out",
            entity_type: "approval",
            entity_id: row.id,
            metadata: { phone: from, reason: "customer_opted_out" },
          });
        }
      }

      // A confirmed future visit can no longer be confirmed by text — a
      // human has to pick up the phone.
      const { data: upcoming } = await db
        .from("appointments")
        .select("scheduled_start")
        .eq("business_id", business.id)
        .in("lead_id", leadIds)
        .eq("status", "confirmed")
        .gt("scheduled_start", new Date().toISOString())
        .order("scheduled_start", { ascending: true })
        .limit(1);
      if (upcoming?.length) {
        const when = new Date(upcoming[0].scheduled_start).toLocaleString();
        await notifyBusinessStaff({
          businessId: business.id,
          businessTwilioNumber: to,
          smsText: `${from} opted out of texts but has an appointment ${when} — call them to confirm`,
          push: {
            title: "Opted-out customer has an appointment",
            body: `${from} — ${when}. Call them to confirm.`,
          },
        });
      }
    }
    await db.from("audit_log").insert({
      business_id: business.id,
      actor_type: "system",
      event_type: "customer_opted_out",
      entity_type: "lead",
      entity_id: leadIds[0] ?? null,
      metadata: { phone: from, keyword: complianceWord, lead_ids: leadIds },
    });
    // Reply NOTHING: Twilio's carrier-level default already confirms the
    // opt-out, and any further text from us after STOP is itself a
    // violation.
    return twiml();
  }

  if (OPT_IN_WORDS.has(complianceWord)) {
    const { data: optInLeads } = await db
      .from("leads")
      .select("id, language, status")
      .eq("business_id", business.id)
      .eq("source_phone_number", from);
    // Only rows the STOP closed come back — a lead already mid-flow (or
    // closed for a real reason other than opt-out) keeps its status.
    const reopenIds = (optInLeads ?? []).filter((l) => l.status === "closed_lost").map((l) => l.id);
    if (reopenIds.length > 0) {
      await db.from("leads").update({ status: "qualifying" }).in("id", reopenIds);
    }
    await db.from("audit_log").insert({
      business_id: business.id,
      actor_type: "system",
      event_type: "customer_opted_in",
      entity_type: "lead",
      entity_id: reopenIds[0] ?? optInLeads?.[0]?.id ?? null,
      metadata: { phone: from, keyword: complianceWord, lead_ids: reopenIds },
    });
    // One confirmation only — START re-opens the carrier channel, so this
    // reply is deliverable and expected.
    try {
      await sendSms({ to: from, from: to, body: optInConfirmation(toCustomerLang(optInLeads?.[0]?.language)) });
    } catch {
      // Best-effort; never a webhook error.
    }
    return twiml();
  }

  if (HELP_WORDS.has(complianceWord)) {
    const { data: helpLeads } = await db
      .from("leads")
      .select("language")
      .eq("business_id", business.id)
      .eq("source_phone_number", from)
      .limit(1);
    try {
      await sendSms({ to: from, from: to, body: helpText(business.name, toCustomerLang(helpLeads?.[0]?.language)) });
    } catch {
      // Best-effort; never a webhook error.
    }
    return twiml();
  }

  // Staffer replies never reach a Twilio error even when Twilio send-back
  // fails — the approval resolution itself is what matters.
  const deliverToStaff = async (text: string) => {
    try {
      await sendSms({ to: from, from: to, body: text });
    } catch {
      // Confirmation text is best-effort.
    }
  };

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
    // Zero pending: a staff text must still never fall through to the AI
    // pipeline — it would become a customer lead on their own number.
    if (!pending) {
      await deliverToStaff("No approvals are waiting right now.");
      return twiml();
    }

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

  try {
    await processInboundMessage({
      businessId: business.id,
      fromPhone: from,
      body,
      // MessageSid makes a Twilio retry idempotent — the pipeline inserts
      // the inbound first and short-circuits on the unique violation.
      inboundSid: gate.params.MessageSid ?? null,
      // Rapid multi-part texts collapse into one AI reply (Layer-1
      // emergencies bypass the wait inside the pipeline).
      debounceMs: 6000,
      deliver: (text) => sendSms({ to: from, from: to, body: text }),
    });
  } catch (err) {
    // 200 anyway: a Twilio retry would re-run the AI turn and duplicate
    // messages; the failure is surfaced via logs instead.
    console.error("[twilio/sms] pipeline failed", err);
  }

  return twiml();
}
