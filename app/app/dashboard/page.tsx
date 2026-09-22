import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppointmentsSchedule, type ScheduleAppointment } from "@/app/_components/shell/appointments-schedule";
import { InstallPrompt } from "./install-prompt";
import { PushDemo } from "./push-demo";

export default async function DashboardHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: staffRow } = await supabase.from("staff").select("business_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (!staffRow) redirect("/onboarding");
  const businessId = staffRow.business_id;

  const [{ data: business }, { count: pendingApprovals }, { count: activeConversations }, { data: upcomingAppointments }] =
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
    ]);

  const stats = [
    { label: "Needs your attention", value: pendingApprovals ?? 0, href: "/dashboard/approvals", emphasize: (pendingApprovals ?? 0) > 0 },
    { label: "Active conversations", value: activeConversations ?? 0, href: "/dashboard/leads", emphasize: false },
    {
      label: "Upcoming appointments",
      value: (upcomingAppointments ?? []).filter((a) => new Date(a.scheduled_start) >= new Date()).length,
      href: "/dashboard/leads",
      emphasize: false,
    },
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

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
      <h1 className="text-2xl font-semibold text-ink lg:text-3xl">{business?.name?.trim()}</h1>
      <p className="mt-1 text-sm text-muted">Control mode: {business?.control_mode}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className={
              "rounded-lg border p-4 transition-colors " +
              (stat.emphasize ? "border-accent-blue/40 bg-accent-blue/5 hover:border-accent-blue" : "border-line bg-card hover:border-accent-blue/50")
            }
          >
            <p className={"text-3xl font-semibold " + (stat.emphasize ? "text-accent-blue" : "text-ink")}>{stat.value}</p>
            <p className="mt-1 text-sm text-ink-soft">{stat.label}</p>
          </Link>
        ))}
      </div>

      <h2 className="mt-8 text-sm font-semibold text-ink">Schedule</h2>
      <div className="mt-3">
        <AppointmentsSchedule appointments={scheduleAppointments} />
      </div>

      <h2 className="mt-8 text-sm font-semibold text-ink">Quick actions</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/dashboard/settings" className="rounded-lg border border-line bg-card p-4 hover:border-accent-blue">
          <h3 className="text-sm font-semibold text-ink">Settings</h3>
          <p className="mt-1 text-xs text-muted">Hours, service area, appointment types, control mode.</p>
        </Link>
        <Link href="/dashboard/dev/simulate" className="rounded-lg border border-line bg-card p-4 hover:border-accent-blue">
          <h3 className="text-sm font-semibold text-ink">Dev SMS simulator</h3>
          <p className="mt-1 text-xs text-muted">Try a conversation without a real phone number.</p>
        </Link>
        <InstallPrompt />
        <PushDemo />
      </div>
    </main>
  );
}
