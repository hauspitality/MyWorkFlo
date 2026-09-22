import { createClient } from "@/lib/supabase/server";
import { OnboardingShell } from "@/app/_components/settings/onboarding-shell";
import { resolveOnboardingBusinessId } from "../_lib";
import { ControlModeStep } from "./control-mode-step";
import type { ControlMode } from "@/lib/supabase/types";

export default async function OnboardingControlModePage() {
  const businessId = await resolveOnboardingBusinessId();
  const supabase = await createClient();
  const [{ data: business }, { data: settings }] = await Promise.all([
    supabase.from("businesses").select("control_mode").eq("id", businessId).single(),
    supabase.from("service_settings").select("approval_expiry_minutes").eq("business_id", businessId).single(),
  ]);

  return (
    <OnboardingShell
      step={7}
      title="How hands-on do you want to be?"
      subtitle="You can change this anytime from Settings."
    >
      <ControlModeStep
        initial={(business?.control_mode as ControlMode) ?? "draft"}
        approvalExpiryMinutes={settings?.approval_expiry_minutes ?? 15}
      />
    </OnboardingShell>
  );
}
