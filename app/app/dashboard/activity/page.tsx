import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function dotClass(eventType: string): string {
  if (eventType.startsWith("emergency_")) return "bg-gauge-red";
  if (eventType.startsWith("approval_")) return "bg-brass";
  if (eventType.startsWith("appointment_") || eventType.includes("booked")) return "bg-gauge-green";
  return "bg-gauge-blue";
}

function humanize(eventType: string): string {
  const s = eventType.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function truncate(value: string, max = 80): string {
  return value.length > max ? value.slice(0, max) + "…" : value;
}

function metadataSummary(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const entries = Object.entries(metadata as Record<string, unknown>);
  if (!entries.length) return null;
  return entries
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${truncate(typeof value === "string" ? value : JSON.stringify(value) ?? "null")}`)
    .join(" · ");
}

export default async function ActivityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: staffRow } = await supabase.from("staff").select("business_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (!staffRow) redirect("/onboarding");

  const { data: events } = await supabase
    .from("audit_log")
    .select("id, actor_type, event_type, metadata, created_at")
    .eq("business_id", staffRow.business_id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
      <h1 className="text-2xl font-semibold text-ink lg:text-3xl">Activity</h1>
      <p className="mt-1 text-sm text-muted">Everything the system did, newest first.</p>

      {!events?.length ? (
        <div className="mt-8 rounded-lg border border-line bg-card p-8 text-center">
          <p className="text-sm text-ink-soft">No activity yet.</p>
          <p className="mt-1 text-xs text-muted">Events appear here as conversations, bookings, and approvals happen.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {events.map((e) => {
            const meta = metadataSummary(e.metadata);
            return (
              <div key={e.id} className="flex items-start gap-3 rounded-lg border border-line bg-card p-4">
                <span className={"mt-1.5 h-2 w-2 shrink-0 rounded-full " + dotClass(e.event_type)} aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="text-sm font-medium text-ink">{humanize(e.event_type)}</p>
                    <span className="rounded-full bg-line px-2 py-0.5 text-xs text-muted">{e.actor_type}</span>
                  </div>
                  {meta && <p className="mt-1 truncate text-xs text-muted">{meta}</p>}
                </div>
                <p className="shrink-0 text-xs text-muted">{new Date(e.created_at).toLocaleString()}</p>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
