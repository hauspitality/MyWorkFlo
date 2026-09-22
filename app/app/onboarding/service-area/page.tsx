import { createClient } from "@/lib/supabase/server";
import { OnboardingShell } from "@/app/_components/settings/onboarding-shell";
import { resolveOnboardingBusinessId } from "../_lib";
import { ServiceAreaStep } from "./service-area-step";
import type { ServiceArea } from "@/lib/supabase/types";

export default async function OnboardingServiceAreaPage() {
  const businessId = await resolveOnboardingBusinessId();
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("service_settings")
    .select("service_area")
    .eq("business_id", businessId)
    .single();

  return (
    <OnboardingShell step={4} title="Where do you work?" subtitle="Zip codes you'll take service calls in.">
      <ServiceAreaStep initial={(settings?.service_area as ServiceArea) ?? { type: "zip_list", zips: [] }} />
    </OnboardingShell>
  );
}
