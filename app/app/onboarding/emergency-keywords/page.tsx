import { createClient } from "@/lib/supabase/server";
import { OnboardingShell } from "@/app/_components/settings/onboarding-shell";
import { resolveOnboardingBusinessId } from "../_lib";
import { EmergencyKeywordsStep } from "./emergency-keywords-step";

export default async function OnboardingEmergencyKeywordsPage() {
  const businessId = await resolveOnboardingBusinessId();
  const supabase = await createClient();
  const [{ data: settings }, { data: business }] = await Promise.all([
    supabase.from("service_settings").select("emergency_keywords").eq("business_id", businessId).single(),
    supabase.from("businesses").select("name").eq("id", businessId).single(),
  ]);

  return (
    <OnboardingShell
      step={6}
      title="Safety triggers"
      subtitle="These always send an instant, pre-written safety reply — no waiting on approval, ever."
    >
      <EmergencyKeywordsStep initial={settings?.emergency_keywords ?? []} businessName={business?.name ?? "your business"} />
    </OnboardingShell>
  );
}
