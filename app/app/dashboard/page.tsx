import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppointmentsSchedule, type ScheduleAppointment } from "@/app/_components/shell/appointments-schedule";
import { Card, CardHeader, Chip } from "@/app/_components/ui";
import { SettingsIcon } from "@/app/_components/shell/nav-items";
import { Greeting } from "./greeting";
import { InstallPrompt } from "./install-prompt";
import { PushDemo } from "./push-demo";

const APPROVAL_TYPE_LABEL: Record<string, string> = {
  outbound_message: "Message needs approval",
  booking: "Booking needs approval",
  emergency_escalation: "Emergency escalation",
  other_exception: "Needs review",
};

// Triage rail: urgency color per approval type.
const APPROVAL_TYPE_BAR: Record<string, string> = {
  outbound_message: "bg-gauge-blue",
  booking: "bg-gauge-green",
  emergency_escalation: "bg-gauge-red",
  other_exception: "bg-gauge-amber",
};

const CONTROL_MODE_CHIP: Record<string, { tone: "blue" | "amber" | "green"; label: string }> = {
  draft: { tone: "blue", label: "Draft mode" },
  assisted: { tone: "amber", label: "Assisted mode" },
  autopilot: { tone: "green", label: "Autopilot" },
};

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

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
  ] =
    await Promise.all([
      supabase.from("businesses").select("name, control_mode").eq("id", businessId).single(),
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
        .select("id, type, payload, requested_at")
        .eq("business_id", businessId)
        .eq("status", "pending")
        .order("requested_at", { ascending: true })
        .limit(5),
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
    { label: "Upcoming appointments", value: upcomingCount, href: "/dashboard/leads", Icon: CalendarIcon, emphasize: false },
  ];

  const scheduleAppointments: ScheduleAppointment[] = (upcomingAppointments ?? []).map((appt) => {
    const apptType = Array.isArray(appt.appointment_types) ? appt.appointment_types[0] : appt.appointment_types;
    const lead = Array.isArray(appt.leads) ? appt.leads[0] : appt.leads;
    return {
      id: appt.id,
      scheduledStart: appt.scheduled_start,
      scheduledEnd: appt.scheduled_end,
      typeName: apptType?.name ?? "Appointment",
      customerName: lead?.name || lead?.source_phone_number || "Customer",
    };
  });

  const modeChip = CONTROL_MODE_CHIP[business?.control_mode ?? "draft"] ?? CONTROL_MODE_CHIP.draft;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Greeting businessName={business?.name?.trim() ?? "there"} />
        <Link href="/dashboard/settings" className="hidden sm:block" aria-label="Control mode — change in settings">
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
                  const payload = item.payload as Record<string, unknown>;
                  const summary =
                    (payload.draft_text as string) ?? (payload.reason as string) ?? (payload.holding_text as string) ?? "See conversation for details.";
                  return (
                    <Link
                      key={item.id}
                      href="/dashboard/approvals"
                      className={"group flex items-center gap-3 py-3 " + (i > 0 ? "border-t border-dashed border-line" : "")}
                    >
                      <span className={`h-9 w-1 shrink-0 rounded-full ${APPROVAL_TYPE_BAR[item.type] ?? "bg-gauge-amber"}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink group-hover:text-accent-blue">
                          {APPROVAL_TYPE_LABEL[item.type] ?? item.type}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted">{summary}</p>
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
        <div className="lg:col-start-3 lg:row-span-2 lg:row-start-1">
          <AppointmentsSchedule appointments={scheduleAppointments} />
        </div>

        {/* Quick actions */}
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2 lg:col-start-1 lg:row-start-2">
            <Card className="p-5">
              <Link href="/dashboard/settings" className="group block">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-paper text-ink-soft transition-colors group-hover:bg-accent-blue-soft group-hover:text-accent-blue">
                  <SettingsIcon className="h-5 w-5" />
                </span>
                <h2 className="mt-3 text-sm font-semibold text-ink group-hover:text-accent-blue">Settings</h2>
                <p className="mt-1 text-xs text-muted">Hours, service area, appointment types, control mode.</p>
              </Link>
            </Card>
            <Card className="p-5">
              <Link href="/dashboard/dev/simulate" className="group block">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-paper text-ink-soft transition-colors group-hover:bg-accent-blue-soft group-hover:text-accent-blue">
                  <ChatIcon className="h-5 w-5" />
                </span>
                <h2 className="mt-3 text-sm font-semibold text-ink group-hover:text-accent-blue">SMS simulator</h2>
                <p className="mt-1 text-xs text-muted">Try a conversation without a real phone number.</p>
              </Link>
            </Card>
            <InstallPrompt />
            <PushDemo />
        </div>
      </div>
    </main>
  );
}
