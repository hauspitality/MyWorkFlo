import { OnboardingShell } from "@/app/_components/settings/onboarding-shell";
import { BusinessForm } from "./business-form";

export default function OnboardingBusinessPage() {
  return (
    <OnboardingShell step={0} title="Tell us about your business" subtitle="Takes about 2 minutes.">
      <BusinessForm />
    </OnboardingShell>
  );
}
