import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ApprovalCard } from "./approval-card";
import {
  APPROVAL_TYPE_LABEL,
  APPROVAL_TYPE_TONE,
  approvalSummary,
} from "@/app/_components/conversation-status";
import { formatPhone, humanizeCode } from "@/lib/format";

export default async function ApprovalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: staffRow } = await supabase.from("staff").select("business_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (!staffRow) redirect("/onboarding");

  const [{ data: approvals }, { data: business }, { data: settings }] = await Promise.all([
    supabase
      .from("approval_queue")
      .select(
        "id, type, payload, requested_at, expires_at, conversation_id, conversations(matched_issue_code, leads(name, source_phone_number))",
      )
      .eq("business_id", staffRow.business_id)
      .eq("status", "pending")
      .order("requested_at", { ascending: true }),
    supabase.from("businesses").select("timezone").eq("id", staffRow.business_id).maybeSingle(),
    supabase.from("service_settings").select("approval_expiry_minutes").eq("business_id", staffRow.business_id).maybeSingle(),
  ]);

  const expiryMinutes: number = settings?.approval_expiry_minutes ?? 15;

  // Rows whose window already closed (but the sweep hasn't caught yet) must
  // never show live buttons — the customer was already told a person will
  // follow up, so approving now would be a lie.
  const now = Date.now();
  const pending = approvals ?? [];
  const actionable = pending.filter((a) => new Date(a.expires_at).getTime() > now);
  const expired = pending.filter((a) => new Date(a.expires_at).getTime() <= now);

  // Emergencies jump the queue; everything else stays oldest-first.
  const sorted = [...actionable].sort(
    (a, b) => Number(b.type === "emergency_escalation") - Number(a.type === "emergency_escalation"),
  );

  // Booking summaries need real appointment-type names — resolve them in one query.
  const apptTypeIds = [
    ...new Set(
      pending
        .filter((a) => a.type === "booking")
        .map((a) => (a.payload as Record<string, unknown>)?.appointment_type_id)
        .filter((id): id is string => typeof id === "string"),
    ),
  ];
  const apptTypeNames = new Map<string, string>();
  if (apptTypeIds.length) {
    const { data: apptTypes } = await supabase
      .from("appointment_types")
      .select("id, name")
      .eq("business_id", staffRow.business_id)
      .in("id", apptTypeIds);
    for (const t of apptTypes ?? []) apptTypeNames.set(t.id, t.name);
  }

  const cardProps = (a: (typeof pending)[number]) => {
    const conversation = Array.isArray(a.conversations) ? a.conversations[0] : a.conversations;
    const lead = Array.isArray(conversation?.leads) ? conversation?.leads[0] : conversation?.leads;
    const payload = (a.payload ?? {}) as Record<string, unknown>;
    const booking =
      a.type === "booking"
        ? {
            appointmentTypeName:
              typeof payload.appointment_type_id === "string" ? apptTypeNames.get(payload.appointment_type_id) : null,
            timezone: business?.timezone,
          }
        : null;
    return {
      id: a.id,
      typeLabel: APPROVAL_TYPE_LABEL[a.type] ?? humanizeCode(a.type),
      tone: APPROVAL_TYPE_TONE[a.type] ?? ("amber" as const),
      summary: approvalSummary(payload, booking),
      draftText: a.type === "outbound_message" && typeof payload.draft_text === "string" ? payload.draft_text : undefined,
      requestedAt: a.requested_at,
      expiresAt: a.expires_at,
      leadName: lead?.name || formatPhone(lead?.source_phone_number) || "Unknown caller",
      // Only show the phone separately when the name line isn't already the phone.
      leadPhone: lead?.name ? formatPhone(lead?.source_phone_number) || undefined : undefined,
      issueLabel: humanizeCode(conversation?.matched_issue_code) || undefined,
      conversationId: a.conversation_id ?? undefined,
    };
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-ink lg:text-3xl">Approvals</h1>
      <p className="mt-1 text-sm text-muted">
        Emergencies first, then oldest. Each request waits {expiryMinutes} minutes before the customer is told a person
        will follow up.
      </p>

      {!sorted.length ? (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-line bg-card px-6 py-10 text-center shadow-card">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-8 w-8 text-gauge-green" aria-hidden="true">
            <circle cx="12" cy="12" r="8.5" />
            <path d="m8.5 12.2 2.4 2.4 4.6-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="mt-3 text-sm font-medium text-ink-soft">All clear</p>
          <p className="mt-1 text-xs text-muted">Nothing is waiting on your approval right now.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {sorted.map((a) => (
            <ApprovalCard key={a.id} {...cardProps(a)} />
          ))}
        </div>
      )}

      {expired.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-medium text-muted">Expired</h2>
          <div className="mt-3 space-y-3 opacity-70">
            {expired.map((a) => (
              <ApprovalCard key={a.id} {...cardProps(a)} expired />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
