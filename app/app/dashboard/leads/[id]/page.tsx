import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ButtonLink, Card, CardHeader, Chip, InitialAvatar } from "@/app/_components/ui";
import {
  APPROVAL_TYPE_LABEL,
  APPROVAL_TYPE_TONE,
  CONVERSATION_STATUS_LABEL,
  CONVERSATION_STATUS_TONE,
  approvalSummary,
} from "@/app/_components/conversation-status";
import { formatDayLabel, formatPhone, formatTimeOfDay, humanizeCode } from "@/lib/format";
import { ApprovalCard } from "../../approvals/approval-card";

const FIELD_LABELS: Record<string, string> = {
  symptom_onset: "Symptom onset",
  equipment_type: "Equipment type",
  equipment_age_or_brand: "Equipment age/brand",
  error_codes_or_lights: "Error codes/lights",
  anyone_home_now: "Anyone home now",
  service_address: "Service address",
  preferred_time_window: "Preferred time window",
  square_footage: "Square footage",
};

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  es: "Spanish",
};

const SENDER_LABELS: Record<string, string> = {
  ai: "AI",
  staff: "Staff",
  system: "System",
};

function humanizeKey(key: string): string {
  return FIELD_LABELS[key] ?? humanizeCode(key);
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: staffRow } = await supabase.from("staff").select("business_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (!staffRow) redirect("/onboarding");

  const { data: conversation } = await supabase
    .from("conversations")
    .select(
      "id, business_id, status, matched_issue_code, collected_fields, detected_language, turn_count, started_at, leads(id, name, source_phone_number, first_contact_at)",
    )
    .eq("id", id)
    .single();

  if (!conversation || conversation.business_id !== staffRow.business_id) notFound();

  const lead = Array.isArray(conversation.leads) ? conversation.leads[0] : conversation.leads;

  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender, body, status, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  const { data: pendingApprovals } = await supabase
    .from("approval_queue")
    .select("id, type, payload, requested_at, expires_at")
    .eq("conversation_id", id)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("requested_at", { ascending: true });

  const collectedFields = Object.entries((conversation.collected_fields as Record<string, string>) ?? {}).filter(
    ([, value]) => value !== null && value !== undefined && value !== "",
  );

  const details: Array<{ label: string; value: string }> = [
    { label: "Issue", value: humanizeCode(conversation.matched_issue_code, "Not yet determined") },
    {
      label: "First contact",
      value: lead?.first_contact_at
        ? new Date(lead.first_contact_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "—",
    },
    {
      label: "Language",
      value: LANGUAGE_LABELS[conversation.detected_language ?? "en"] ?? (conversation.detected_language ?? "en").toUpperCase(),
    },
    ...collectedFields.map(([key, value]) => ({ label: humanizeKey(key), value })),
  ];

  const customerLabel = lead?.name?.trim().split(/\s+/)[0] || "Customer";

  let previousDay = "";

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <Link href="/dashboard/leads" className="text-sm font-medium text-muted transition-colors hover:text-ink">
        ← Back to leads
      </Link>

      {/* Header */}
      <Card className="mt-4 flex flex-wrap items-center justify-between gap-4 p-5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <InitialAvatar label={lead?.name || lead?.source_phone_number || "?"} className="h-11 w-11 text-base" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight text-ink">{lead?.name || "Unknown caller"}</h1>
              <Chip tone={CONVERSATION_STATUS_TONE[conversation.status] ?? "neutral"}>
                {CONVERSATION_STATUS_LABEL[conversation.status] ?? humanizeCode(conversation.status)}
              </Chip>
            </div>
            <p className="mt-0.5 text-sm tabular-nums text-muted">{formatPhone(lead?.source_phone_number)}</p>
          </div>
        </div>
        {lead?.source_phone_number && (
          <div className="flex shrink-0 gap-2">
            <ButtonLink href={`tel:${lead.source_phone_number}`} variant="secondary">
              Call
            </ButtonLink>
            <ButtonLink href={`sms:${lead.source_phone_number}`}>Text</ButtonLink>
          </div>
        )}
      </Card>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-3">
        {/* Rail — approvals first, then details; on mobile this sits above the thread */}
        <div className="space-y-4 lg:col-start-3 lg:row-start-1">
          {(pendingApprovals?.length ?? 0) > 0 && (
            <div className="space-y-3">
              {(pendingApprovals ?? []).map((a) => (
                <ApprovalCard
                  key={a.id}
                  id={a.id}
                  typeLabel={APPROVAL_TYPE_LABEL[a.type] ?? humanizeCode(a.type)}
                  tone={APPROVAL_TYPE_TONE[a.type] ?? "amber"}
                  summary={approvalSummary(a.payload as Record<string, unknown>)}
                  requestedAt={a.requested_at}
                  expiresAt={a.expires_at}
                />
              ))}
            </div>
          )}

          <Card>
            <CardHeader title="Details" />
            <dl className="px-5 pb-4 sm:px-6">
              {details.map((fact, i) => (
                <div key={fact.label} className={"flex items-baseline justify-between gap-4 py-2.5 " + (i > 0 ? "border-t border-dashed border-line" : "")}>
                  <dt className="shrink-0 text-xs text-muted">{fact.label}</dt>
                  <dd className="min-w-0 truncate text-right text-sm font-medium text-ink">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>

        {/* Thread */}
        <div className="lg:col-span-2 lg:col-start-1 lg:row-start-1">
          <Card>
            <CardHeader title="Conversation" />
            <div className="space-y-2 px-5 pb-5 sm:px-6">
              {!messages?.length ? (
                <p className="py-6 text-center text-sm text-muted">No messages yet.</p>
              ) : (
                messages.map((m) => {
                  const day = formatDayLabel(m.created_at);
                  const showDivider = day !== previousDay;
                  previousDay = day;
                  const fromCustomer = m.sender === "customer";
                  const senderLabel = fromCustomer ? customerLabel : (SENDER_LABELS[m.sender] ?? humanizeCode(m.sender));
                  return (
                    <div key={m.id}>
                      {showDivider && (
                        <p className="py-2 text-center text-[11px] font-medium uppercase tracking-wide text-faint">{day}</p>
                      )}
                      <div className={fromCustomer ? "text-left" : "text-right"}>
                        <div
                          className={
                            "inline-block max-w-[85%] rounded-2xl px-3.5 py-2.5 text-left text-sm text-ink sm:max-w-[75%] " +
                            (fromCustomer ? "border border-line bg-paper" : "bg-accent-blue-soft")
                          }
                        >
                          <p>{m.body}</p>
                          <p className="mt-1 text-[11px] tabular-nums text-muted">
                            {senderLabel} · {formatTimeOfDay(m.created_at)}
                          </p>
                          {!fromCustomer && m.status === "queued" && (
                            <p className="mt-0.5 text-[11px] font-medium text-gauge-amber">Draft — awaiting your approval</p>
                          )}
                          {!fromCustomer && m.status === "failed" && (
                            <p className="mt-0.5 text-[11px] font-medium text-gauge-red">Failed to send</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
