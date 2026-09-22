import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { timezoneLabel } from "@/lib/timezones";
import { SettingsClient } from "./settings-client";
import type { AppointmentTypeRow } from "@/app/_components/settings/appointment-types-editor";
import type { BusinessHours, ControlMode, PlanTier, ServiceArea } from "@/lib/supabase/types";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: staffRow } = await supabase.from("staff").select("business_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (!staffRow) redirect("/onboarding");
  const businessId = staffRow.business_id;

  const [{ data: business }, { data: settings }, { data: apptRows }, { data: staffList }, { data: calendarConnection }] =
    await Promise.all([
      supabase
        .from("businesses")
        .select("name, timezone, control_mode, subscription_status, plan_tier, twilio_phone_number")
        .eq("id", businessId)
        .single(),
      supabase
        .from("service_settings")
        .select("business_hours, service_area, emergency_keywords, approval_expiry_minutes")
        .eq("business_id", businessId)
        .single(),
      supabase
        .from("appointment_types")
        .select(
          "id, name, duration_minutes, auto_bookable, hvac_issue_codes, pricing_guidance(price_range_min, price_range_max, display_text, is_quotable_by_ai)",
        )
        .eq("business_id", businessId)
        .eq("is_active", true),
      supabase.from("staff").select("id, name, phone_number, role, is_active").eq("business_id", businessId),
      supabase.from("calendar_connections").select("status").eq("business_id", businessId).eq("status", "active").maybeSingle(),
    ]);

  const appointmentTypes: AppointmentTypeRow[] = (apptRows ?? []).map((row) => {
    const pricing = Array.isArray(row.pricing_guidance) ? row.pricing_guidance[0] : row.pricing_guidance;
    return {
      id: row.id,
      name: row.name,
      duration_minutes: row.duration_minutes,
      auto_bookable: row.auto_bookable,
      hvac_issue_codes: row.hvac_issue_codes,
      pricing: pricing ?? null,
    };
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-ink lg:text-3xl">Settings</h1>
      <p className="mt-1 text-sm text-muted">
        {business?.name} &middot; {timezoneLabel(business?.timezone)}
      </p>

      <SettingsClient
        businessName={business?.name ?? ""}
        controlMode={(business?.control_mode as ControlMode) ?? "draft"}
        approvalExpiryMinutes={settings?.approval_expiry_minutes ?? 15}
        businessHours={(settings?.business_hours as BusinessHours) ?? {}}
        serviceArea={(settings?.service_area as ServiceArea) ?? { type: "zip_list", zips: [] }}
        emergencyKeywords={settings?.emergency_keywords ?? []}
        appointmentTypes={appointmentTypes}
        staff={staffList ?? []}
        planTier={(business?.plan_tier as PlanTier) ?? null}
        twilioPhoneNumber={business?.twilio_phone_number ?? null}
        calendarConnected={Boolean(calendarConnection)}
        subscriptionStatus={business?.subscription_status ?? null}
        userEmail={user.email ?? ""}
      />
    </main>
  );
}
