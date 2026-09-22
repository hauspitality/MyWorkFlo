import { createClient } from "@/lib/supabase/server";
import { OnboardingShell } from "@/app/_components/settings/onboarding-shell";
import { resolveOnboardingBusinessId } from "../_lib";
import { EmergencyKeywordsStep } from "./emergency-keywords-step";

export default async function OnboardingEmergencyKeywordsPage() {
  const businessId = await resolveOnboardingBusinessId();
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("service_settings")
    .select("emergency_keywords")
    .eq("business_id", businessId)
    .single();

  return (
    <OnboardingShell
      step={4}
      title="Safety triggers"
      subtitle="These always send an instant, pre-written safety reply — no waiting on approval, ever."
    >
      <EmergencyKeywordsStep initial={settings?.emergency_keywords ?? []} />
    </OnboardingShell>
  );
}
