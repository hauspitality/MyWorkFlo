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

  const { data: approvals } = await supabase
    .from("approval_queue")
    .select(
      "id, type, payload, requested_at, expires_at, conversation_id, conversations(matched_issue_code, leads(name, source_phone_number))",
    )
    .eq("business_id", staffRow.business_id)
    .eq("status", "pending")
    .order("requested_at", { ascending: true });

  // Emergencies jump the queue; everything else stays oldest-first.
  const sorted = [...(approvals ?? [])].sort(
    (a, b) => Number(b.type === "emergency_escalation") - Number(a.type === "emergency_escalation"),
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-ink lg:text-3xl">Approvals</h1>
      <p className="mt-1 text-sm text-muted">Emergencies first, then oldest.</p>

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
          {sorted.map((a) => {
            const conversation = Array.isArray(a.conversations) ? a.conversations[0] : a.conversations;
            const lead = Array.isArray(conversation?.leads) ? conversation?.leads[0] : conversation?.leads;
            return (
              <ApprovalCard
                key={a.id}
                id={a.id}
                typeLabel={APPROVAL_TYPE_LABEL[a.type] ?? humanizeCode(a.type)}
                tone={APPROVAL_TYPE_TONE[a.type] ?? "amber"}
                summary={approvalSummary(a.payload as Record<string, unknown>)}
                requestedAt={a.requested_at}
                expiresAt={a.expires_at}
                leadName={lead?.name || formatPhone(lead?.source_phone_number) || "Unknown caller"}
                issueLabel={humanizeCode(conversation?.matched_issue_code) || undefined}
                conversationId={a.conversation_id ?? undefined}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}
