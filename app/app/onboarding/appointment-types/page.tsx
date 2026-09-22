import { createClient } from "@/lib/supabase/server";
import { OnboardingShell } from "@/app/_components/settings/onboarding-shell";
import { resolveOnboardingBusinessId } from "../_lib";
import { AppointmentTypesStep } from "./appointment-types-step";
import type { AppointmentTypeRow } from "@/app/_components/settings/appointment-types-editor";

export default async function OnboardingAppointmentTypesPage() {
  const businessId = await resolveOnboardingBusinessId();
  const supabase = await createClient();
  const { data } = await supabase
    .from("appointment_types")
    .select("id, name, duration_minutes, auto_bookable, hvac_issue_codes, pricing_guidance(price_range_min, price_range_max, display_text, is_quotable_by_ai)")
    .eq("business_id", businessId)
    .eq("is_active", true);

  const initial: AppointmentTypeRow[] = (data ?? []).map((row) => {
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
    <OnboardingShell
      step={5}
      title="What can customers book?"
      subtitle="We've pre-filled common HVAC visits — edit or add your own."
    >
      <AppointmentTypesStep initial={initial} />
    </OnboardingShell>
  );
}
