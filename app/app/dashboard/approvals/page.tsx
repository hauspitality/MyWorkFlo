import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ApprovalCard } from "./approval-card";

const TYPE_LABEL: Record<string, string> = {
  outbound_message: "Message needs approval",
  booking: "Booking needs approval",
  emergency_escalation: "Emergency escalation",
  other_exception: "Needs review",
};

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
    .select("id, type, payload, requested_at, expires_at")
    .eq("business_id", staffRow.business_id)
    .eq("status", "pending")
    .order("requested_at", { ascending: true });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight text-ink lg:text-3xl">Approvals</h1>
      <p className="mt-1 text-sm text-muted">Oldest first.</p>

      {!approvals?.length ? (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-line bg-card px-6 py-10 text-center shadow-card">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-8 w-8 text-gauge-green" aria-hidden="true">
            <circle cx="12" cy="12" r="8.5" />
            <path d="m8.5 12.2 2.4 2.4 4.6-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="mt-3 text-sm font-medium text-ink-soft">All clear</p>
          <p className="mt-1 text-xs text-muted">Nothing is waiting on your approval right now.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {approvals.map((a) => {
            const payload = a.payload as Record<string, unknown>;
            const summary =
              (payload.draft_text as string) ?? (payload.reason as string) ?? (payload.holding_text as string) ?? "See conversation for details.";
            return (
              <ApprovalCard
                key={a.id}
                id={a.id}
                typeLabel={TYPE_LABEL[a.type] ?? a.type}
                summary={summary}
                requestedAt={a.requested_at}
                expiresAt={a.expires_at}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}
