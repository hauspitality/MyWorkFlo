import { createClient } from "@/lib/supabase/server";
import { OnboardingShell } from "@/app/_components/settings/onboarding-shell";
import { resolveOnboardingBusinessId } from "../_lib";
import { HoursStep } from "./hours-step";
import type { BusinessHours } from "@/lib/supabase/types";

export default async function OnboardingHoursPage() {
  const businessId = await resolveOnboardingBusinessId();
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("service_settings")
    .select("business_hours")
    .eq("business_id", businessId)
    .single();

  return (
    <OnboardingShell step={1} title="When are you open?" subtitle="This is when the AI can offer appointment slots.">
      <HoursStep initial={(settings?.business_hours as BusinessHours) ?? {}} />
    </OnboardingShell>
  );
}
