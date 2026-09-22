import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppointmentsSchedule, type ScheduleAppointment } from "@/app/_components/shell/appointments-schedule";
import { Card, CardHeader, Chip, InitialAvatar } from "@/app/_components/ui";
import {
  APPROVAL_TYPE_LABEL,
  APPROVAL_TYPE_TONE,
  CONVERSATION_STATUS_LABEL,
  CONVERSATION_STATUS_TONE,
  TONE_BAR,
  approvalSummary,
} from "@/app/_components/conversation-status";
import { formatPhone, formatRelative, humanizeCode } from "@/lib/format";
import { Greeting } from "./greeting";
import { SetupChecklist } from "./setup-checklist";

const CONTROL_MODE_CHIP: Record<string, { tone: "blue" | "amber" | "green"; label: string }> = {
  draft: { tone: "blue", label: "Draft mode" },
  assisted: { tone: "amber", label: "Assisted mode" },
  autopilot: { tone: "green", label: "Autopilot" },
};

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className}>
      <path d="M12 9v4.5M12 16.8v.2" strokeLinecap="round" />
      <path d="M10.3 4.1 3.5 16a2 2 0 0 0 1.7 3h13.6a2 2 0 0 0 1.7-3L13.7 4.1a2 2 0 0 0-3.4 0Z" strokeLinejoin="round" />
    </svg>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className}>
      <path d="M20 12a8 8 0 1 0-3.1 6.3L20 19l-.6-3A8 8 0 0 0 20 12Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className}>
      <rect x="4" y="5.5" width="16" height="15" rx="3" />
      <path d="M4 10h16M8.5 3.5v3M15.5 3.5v3" strokeLinecap="round" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 12.2 2.4 2.4 4.6-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function DashboardHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: staffRow } = await supabase.from("staff").select("business_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (!staffRow) redirect("/onboarding");
  const businessId = staffRow.business_id;

  const [
    { data: business },
    { count: pendingApprovals },
    { count: activeConversations },
    { data: upcomingAppointments },
    { data: attentionItems },
    { data: recentConversations },
    { data: calendarConnection },
  ] =
    await Promise.all([
      supabase.from("businesses").select("name, control_mode, subscription_status").eq("id", businessId).single(),
      supabase.from("approval_queue").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("status", "pending"),
      supabase
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .in("status", ["active", "awaiting_staff_approval"]),
      supabase
        .from("appointments")
        .select("id, scheduled_start, scheduled_end, appointment_types(name), leads(name, source_phone_number)")
        .eq("business_id", businessId)
        .eq("status", "confirmed")
        .gte("scheduled_start", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
        .lte("scheduled_start", new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0).toISOString())
        .order("scheduled_start", { ascending: true })
        .limit(200),
      supabase
        .from("approval_queue")
        .select("id, type, payload, requested_at, conversation_id, conversations(leads(name, source_phone_number))")
        .eq("business_id", businessId)
        .eq("status", "pending")
        .order("requested_at", { ascending: true })
        .limit(5),
      supabase
        .from("conversations")
        .select("id, status, matched_issue_code, last_message_at, leads(name, source_phone_number)")
        .eq("business_id", businessId)
        .order("last_message_at", { ascending: false })
        .limit(3),
      supabase.from("calendar_connections").select("id").eq("business_id", businessId).eq("status", "active").maybeSingle(),
    ]);

  const upcomingCount = (upcomingAppointments ?? []).filter((a) => new Date(a.scheduled_start) >= new Date()).length;

  const stats = [
    {
      label: "Need your attention",
      value: pendingApprovals ?? 0,
      href: "/dashboard/approvals",
      Icon: AlertIcon,
      emphasize: (pendingApprovals ?? 0) > 0,
    },
    { label: "Active conversations", value: activeConversations ?? 0, href: "/dashboard/leads", Icon: ChatIcon, emphasize: false },
    { label: "Upcoming appointments", value: upcomingCount, href: "#schedule", Icon: CalendarIcon, emphasize: false },
  ];

  const scheduleAppointments: ScheduleAppointment[] = (upcomingAppointments ?? []).map((appt) => {
    const apptType = Array.isArray(appt.appointment_types) ? appt.appointment_types[0] : appt.appointment_types;
    const lead = Array.isArray(appt.leads) ? appt.leads[0] : appt.leads;
    return {
      id: appt.id,
      scheduledStart: appt.scheduled_start,
      scheduledEnd: appt.scheduled_end,
      typeName: apptType?.name ?? "Appointment",
      customerName: lead?.name || formatPhone(lead?.source_phone_number) || "Customer",
    };
  });

  const modeChip = CONTROL_MODE_CHIP[business?.control_mode ?? "draft"] ?? CONTROL_MODE_CHIP.draft;
  const planActive = business?.subscription_status === "active" || business?.subscription_status === "trialing";

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Greeting businessName={business?.name} />
        <Link href="/dashboard/settings" aria-label="Control mode — change in settings">
          <Chip tone={modeChip.tone}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {modeChip.label}
          </Chip>
        </Link>
      </div>

      {/* Stat strip */}
      <Card className="mt-6 grid grid-cols-3 divide-x divide-line sm:rounded-full">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group flex min-w-0 flex-col items-center gap-1 px-3 py-4 text-center first:rounded-l-2xl last:rounded-r-2xl sm:flex-row sm:gap-3 sm:px-6 sm:text-left sm:first:rounded-l-full sm:last:rounded-r-full"
          >
            <stat.Icon className={"hidden h-5 w-5 shrink-0 sm:block " + (stat.emphasize ? "text-gauge-red" : "text-muted")} />
            <span className={"text-xl font-semibold tabular-nums sm:text-lg " + (stat.emphasize ? "text-gauge-red" : "text-ink")}>
              {stat.value}
            </span>
            <span className="text-[11px] leading-tight text-muted transition-colors group-hover:text-ink-soft sm:text-sm">{stat.label}</span>
          </Link>
        ))}
      </Card>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 lg:col-start-1 lg:row-start-1">
          {/* Needs your attention */}
          <Card>
            <CardHeader
              title="Needs your attention"
              count={pendingApprovals ?? 0}
              action={attentionItems?.length ? { label: "See all", href: "/dashboard/approvals" } : undefined}
            />
            {!attentionItems?.length ? (
              <div className="flex flex-col items-center px-6 pb-8 pt-4 text-center">
                <CheckCircleIcon className="h-8 w-8 text-gauge-green" />
                <p className="mt-3 text-sm font-medium text-ink-soft">All clear</p>
                <p className="mt-1 text-xs text-muted">Nothing is waiting on your approval right now.</p>
              </div>
            ) : (
              <div className="px-5 pb-3 sm:px-6">
                {attentionItems.map((item, i) => {
                  const conversation = Array.isArray(item.conversations) ? item.conversations[0] : item.conversations;
                  const lead = Array.isArray(conversation?.leads) ? conversation?.leads[0] : conversation?.leads;
                  const who = lead?.name || formatPhone(lead?.source_phone_number) || "Unknown caller";
                  const summary = approvalSummary(item.payload as Record<string, unknown>);
                  const href = item.conversation_id ? `/dashboard/leads/${item.conversation_id}` : "/dashboard/approvals";
                  return (
                    <Link
                      key={item.id}
                      href={href}
                      className={"group flex items-center gap-3 py-3 " + (i > 0 ? "border-t border-dashed border-line" : "")}
                    >
                      <span
                        className={`h-9 w-1 shrink-0 rounded-full ${TONE_BAR[APPROVAL_TYPE_TONE[item.type] ?? "amber"]}`}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink group-hover:text-accent-blue">
                          {APPROVAL_TYPE_LABEL[item.type] ?? humanizeCode(item.type)}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted">
                          {who} · {summary}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-muted">{formatRelative(item.requested_at)}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Schedule rail — right column on desktop, directly after attention on mobile */}
        <div id="schedule" className="scroll-mt-24 lg:col-start-3 lg:row-span-3 lg:row-start-1">
          <AppointmentsSchedule appointments={scheduleAppointments} />
        </div>

        {/* Recent conversations */}
        <div className="lg:col-span-2 lg:col-start-1 lg:row-start-2">
          <Card>
            <CardHeader
              title="Recent conversations"
              action={recentConversations?.length ? { label: "See all", href: "/dashboard/leads" } : undefined}
            />
            {!recentConversations?.length ? (
              <div className="px-6 pb-6 pt-2 text-center">
                <p className="text-sm font-medium text-ink-soft">No conversations yet</p>
                <p className="mt-1 text-xs text-muted">
                  Real texts land here automatically — or try the{" "}
                  <Link href="/dashboard/dev/simulate" className="font-medium text-accent-blue hover:text-accent-blue-deep">
                    SMS simulator
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <div className="px-5 pb-3 sm:px-6">
                {recentConversations.map((c, i) => {
                  const lead = Array.isArray(c.leads) ? c.leads[0] : c.leads;
                  return (
                    <Link
                      key={c.id}
                      href={`/dashboard/leads/${c.id}`}
                      className={"group flex items-center gap-3 py-3 " + (i > 0 ? "border-t border-dashed border-line" : "")}
                    >
                      <InitialAvatar label={lead?.name || lead?.source_phone_number || "?"} className="h-9 w-9 text-xs" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink group-hover:text-accent-blue">
                          {lead?.name || formatPhone(lead?.source_phone_number) || "Unknown caller"}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted">
                          {humanizeCode(c.matched_issue_code, "Not yet determined")} · {formatRelative(c.last_message_at)}
                        </p>
                      </div>
                      <Chip tone={CONVERSATION_STATUS_TONE[c.status] ?? "neutral"} className="shrink-0">
                        {CONVERSATION_STATUS_LABEL[c.status] ?? humanizeCode(c.status)}
                      </Chip>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Setup checklist — renders only while something is unfinished */}
        <div className="lg:col-span-2 lg:col-start-1 lg:row-start-3">
          <SetupChecklist calendarConnected={Boolean(calendarConnection)} planActive={planActive} />
        </div>
      </div>
    </main>
  );
}
