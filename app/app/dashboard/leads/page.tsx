import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-accent-blue/10 text-accent-blue",
  awaiting_staff_approval: "bg-brass-soft text-brass-deep",
  booked: "bg-gauge-green-soft text-gauge-green",
  escalated_emergency: "bg-gauge-red-soft text-gauge-red",
  escalated_priority: "bg-gauge-red-soft text-gauge-red",
  closed: "bg-line text-muted",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  awaiting_staff_approval: "Awaiting approval",
  booked: "Booked",
  escalated_emergency: "Emergency",
  escalated_priority: "Escalated",
  closed: "Closed",
};

export default async function LeadsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: staffRow } = await supabase.from("staff").select("business_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (!staffRow) redirect("/onboarding");

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, status, matched_issue_code, turn_count, detected_language, last_message_at, leads(name, source_phone_number)")
    .eq("business_id", staffRow.business_id)
    .order("last_message_at", { ascending: false })
    .limit(50);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
      <h1 className="text-2xl font-semibold text-ink lg:text-3xl">Leads</h1>
      <p className="mt-1 text-sm text-muted">Every customer conversation, most recent first.</p>

      {!conversations?.length ? (
        <div className="mt-8 rounded-lg border border-line bg-card p-8 text-center">
          <p className="text-sm text-ink-soft">No conversations yet.</p>
          <p className="mt-1 text-xs text-muted">
            Real conversations land here once texts start coming in, or try the{" "}
            <a href="/dashboard/dev/simulate" className="text-accent-blue">
              dev simulator
            </a>
            .
          </p>
        </div>
      ) : (
        <>
          {/* Mobile: stacked cards */}
          <div className="mt-6 space-y-2 lg:hidden">
            {conversations.map((c) => {
              const lead = Array.isArray(c.leads) ? c.leads[0] : c.leads;
              return (
                <Link
                  key={c.id}
                  href={`/dashboard/leads/${c.id}`}
                  className="flex items-center justify-between gap-4 rounded-lg border border-line bg-card p-4 hover:border-accent-blue/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{lead?.name || lead?.source_phone_number || "Unknown"}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {c.matched_issue_code ?? "Not yet determined"} &middot; {c.turn_count} messages
                      {c.detected_language && c.detected_language !== "en" ? ` · ${c.detected_language}` : ""}
                    </p>
                  </div>
                  <span className={"shrink-0 rounded-full px-2.5 py-1 text-xs font-medium " + (STATUS_STYLE[c.status] ?? "bg-line text-muted")}>
                    {STATUS_LABEL[c.status] ?? c.status}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Desktop: table */}
          <div className="mt-6 hidden overflow-hidden rounded-lg border border-line bg-card lg:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-muted">
                  <th className="px-4 py-3 font-medium">Name / phone</th>
                  <th className="px-4 py-3 font-medium">Issue</th>
                  <th className="px-4 py-3 font-medium">Messages</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {conversations.map((c) => {
                  const lead = Array.isArray(c.leads) ? c.leads[0] : c.leads;
                  return (
                    <tr key={c.id} className="border-b border-line last:border-0 hover:bg-paper">
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/leads/${c.id}`} className="font-medium text-ink hover:text-accent-blue">
                          {lead?.name || lead?.source_phone_number || "Unknown"}
                        </Link>
                        {lead?.name && <p className="text-xs text-muted">{lead.source_phone_number}</p>}
                      </td>
                      <td className="px-4 py-3 text-ink-soft">
                        {c.matched_issue_code ?? "Not yet determined"}
                        {c.detected_language && c.detected_language !== "en" ? ` · ${c.detected_language}` : ""}
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{c.turn_count}</td>
                      <td className="px-4 py-3">
                        <span className={"rounded-full px-2.5 py-1 text-xs font-medium " + (STATUS_STYLE[c.status] ?? "bg-line text-muted")}>
                          {STATUS_LABEL[c.status] ?? c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted">{new Date(c.last_message_at).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
