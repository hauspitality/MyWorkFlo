import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDayLabel, formatTimeOfDay, humanizeCode } from "@/lib/format";

function railClass(eventType: string): string {
  if (eventType.startsWith("emergency_")) return "bg-gauge-red";
  if (eventType.startsWith("approval_")) return "bg-gauge-amber";
  if (eventType.startsWith("appointment_") || eventType.includes("booked")) return "bg-gauge-green";
  return "bg-gauge-blue";
}

/** Friendly titles for the events the system writes; anything new falls back to humanized snake_case. */
const EVENT_TITLE: Record<string, string> = {
  approval_approved_message: "Message approved",
  approval_approved_booking: "Booking approved",
  approval_declined: "Request declined",
  approval_auto_expired: "Approval expired",
  approval_execution_failed: "Approved action failed",
  message_queued_for_approval: "Message queued for approval",
  booking_queued_for_approval: "Booking queued for approval",
  appointment_booked: "Appointment booked",
  emergency_escalated: "Emergency escalated",
  autopilot_booking_failed: "Autopilot booking failed",
  missed_call_text_back_triggered: "Missed call — texted back",
  staff_sms_approval_processed: "Approval handled by text",
  stripe_subscription_synced: "Subscription updated",
};

const ACTOR_LABEL: Record<string, string> = {
  ai: "AI",
  staff: "Staff",
  system: "System",
  customer: "Customer",
};

const CHANNEL_LABEL: Record<string, string> = {
  magic_link: "via approval link",
  dashboard: "from the dashboard",
  sms: "by text",
};

function truncate(value: string, max = 70): string {
  return value.length > max ? value.slice(0, max) + "…" : value;
}

/**
 * Operator-facing digest of an event's metadata: IDs stay internal, known
 * keys get friendly phrasing, the rest is humanized key/value pairs.
 */
function metadataSummary(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const parts: string[] = [];
  for (const [key, value] of Object.entries(metadata as Record<string, unknown>)) {
    if (parts.length >= 3) break;
    if (key === "id" || key.endsWith("_id") || value === null || value === undefined) continue;
    if (key === "response_channel" && typeof value === "string") {
      parts.push(CHANNEL_LABEL[value] ?? humanizeCode(value));
      continue;
    }
    const rendered = typeof value === "string" ? value : JSON.stringify(value);
    if (!rendered || rendered === "{}" || rendered === "[]") continue;
    parts.push(`${humanizeCode(key)}: ${truncate(rendered)}`);
  }
  return parts.length ? parts.join(" · ") : null;
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

  const groups: Array<{ day: string; events: NonNullable<typeof events> }> = [];
  for (const event of events ?? []) {
    const day = formatDayLabel(event.created_at);
    const last = groups[groups.length - 1];
    if (last?.day === day) last.events.push(event);
    else groups.push({ day, events: [event] });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-ink lg:text-3xl">Activity</h1>
      <p className="mt-1 text-sm text-muted">Everything the system did, newest first.</p>

      {!events?.length ? (
        <div className="mt-6 rounded-2xl border border-line bg-card px-6 py-10 text-center shadow-card">
          <p className="text-sm font-medium text-ink-soft">No activity yet</p>
          <p className="mt-1 text-xs text-muted">Events appear here as conversations, bookings, and approvals happen.</p>
        </div>
      ) : (
        <>
          <div className="mt-6 space-y-4">
            {groups.map((group) => (
              <section key={group.day}>
                <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">{group.day}</h2>
                <div className="mt-2 rounded-2xl border border-line bg-card px-5 py-2 shadow-card sm:px-6">
                  {group.events.map((e, i) => {
                    const meta = metadataSummary(e.metadata);
                    return (
                      <div key={e.id} className={"flex items-center gap-3 py-3 " + (i > 0 ? "border-t border-dashed border-line" : "")}>
                        <span className={"h-9 w-1 shrink-0 rounded-full " + railClass(e.event_type)} aria-hidden />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <p className="text-sm font-medium text-ink">{EVENT_TITLE[e.event_type] ?? humanizeCode(e.event_type)}</p>
                            <span className="rounded-full bg-paper px-2 py-0.5 text-[11px] font-medium text-muted">
                              {ACTOR_LABEL[e.actor_type] ?? humanizeCode(e.actor_type)}
                            </span>
                          </div>
                          {meta && <p className="mt-0.5 truncate text-xs text-muted">{meta}</p>}
                        </div>
                        <p className="shrink-0 text-xs tabular-nums text-muted">{formatTimeOfDay(e.created_at)}</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
          {events.length === 100 && (
            <p className="mt-4 text-center text-xs text-muted">Showing the last 100 events.</p>
          )}
        </>
      )}
    </main>
  );
}
