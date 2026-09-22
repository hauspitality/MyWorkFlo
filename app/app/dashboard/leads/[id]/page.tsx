import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UserAvatar } from "@/app/_components/shell/dashboard-shell";
import { ApprovalCard } from "../../approvals/approval-card";

const APPROVAL_TYPE_LABEL: Record<string, string> = {
  outbound_message: "Message needs approval",
  booking: "Booking needs approval",
  emergency_escalation: "Emergency escalation",
  other_exception: "Needs review",
};

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

function humanizeKey(key: string): string {
  return FIELD_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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

  const serviceAddress = (conversation.collected_fields as Record<string, string>)?.service_address;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 lg:px-8">
      <Link href="/dashboard/leads" className="text-sm text-accent-blue">
        ← Back to leads
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4 rounded-lg border border-line bg-card p-5">
        <div className="flex items-center gap-3">
          <UserAvatar label={lead?.name || lead?.source_phone_number || "?"} className="h-11 w-11 text-base" />
          <div>
            <h1 className="text-xl font-semibold text-ink">{lead?.name || "Unknown caller"}</h1>
            <p className="text-sm text-muted">{lead?.source_phone_number}</p>
          </div>
        </div>
        {lead?.source_phone_number && (
          <div className="flex shrink-0 gap-2">
            <a
              href={`tel:${lead.source_phone_number}`}
              className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-paper"
            >
              Call
            </a>
            <a
              href={`sms:${lead.source_phone_number}`}
              className="rounded-md bg-accent-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-blue-deep"
            >
              Text
            </a>
          </div>
        )}
      </div>

      {collectedFields.length > 0 && (
        <div className="mt-4 rounded-lg border border-line bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold text-ink">At a glance</h2>
          <p className="text-sm text-ink-soft">
            {collectedFields.map(([key, value]) => `${humanizeKey(key)}: ${value}`).join(" · ")}
          </p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "First contact", value: lead?.first_contact_at ? new Date(lead.first_contact_at).toLocaleDateString() : "—" },
          {
            label: "Issue",
            value: conversation.matched_issue_code
              ? conversation.matched_issue_code.toLowerCase().replaceAll("_", " ").replace(/^./, (c: string) => c.toUpperCase())
              : "Not yet determined",
          },
          { label: "Language", value: conversation.detected_language ?? "en" },
          { label: "Address", value: serviceAddress ?? "Not yet given" },
        ].map((fact) => (
          <div key={fact.label} className="rounded-lg border border-line bg-card p-3">
            <p className="text-xs text-muted">{fact.label}</p>
            <p className="mt-0.5 truncate text-sm font-medium text-ink">{fact.value}</p>
          </div>
        ))}
      </div>

      {(pendingApprovals?.length ?? 0) > 0 && (
        <div className="mt-4">
          <h2 className="mb-2 text-sm font-semibold text-ink">Waiting on you</h2>
          <div className="space-y-2">
            {(pendingApprovals ?? []).map((a) => {
              const payload = a.payload as Record<string, unknown>;
              const summary =
                (payload.draft_text as string) ??
                (payload.reason as string) ??
                (payload.holding_text as string) ??
                "See conversation for details.";
              return (
                <ApprovalCard
                  key={a.id}
                  id={a.id}
                  typeLabel={APPROVAL_TYPE_LABEL[a.type] ?? a.type}
                  summary={summary}
                  requestedAt={a.requested_at}
                  expiresAt={a.expires_at}
                />
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4 rounded-lg border border-line bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-ink">Thread</h2>
        <div className="space-y-2">
          {(messages ?? []).map((m) => (
            <div key={m.id} className={m.sender === "customer" ? "text-left" : "text-right"}>
              <div
                className={
                  "inline-block max-w-[80%] rounded-lg px-3 py-2 text-sm " +
                  (m.sender === "customer" ? "bg-paper border border-line text-ink" : "bg-accent-blue/10 border border-accent-blue/30 text-ink")
                }
              >
                <p>{m.body}</p>
                <p className="mt-1 text-[11px] uppercase text-muted">
                  {m.sender} · {m.status}
                </p>
                {m.sender !== "customer" && m.status === "queued" && (
                  <p className="mt-0.5 text-[11px] text-gauge-amber">draft — awaiting approval</p>
                )}
                {m.sender !== "customer" && m.status === "failed" && (
                  <p className="mt-0.5 text-[11px] text-gauge-red">failed</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
