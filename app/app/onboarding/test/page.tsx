import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { OnboardingShell } from "@/app/_components/settings/onboarding-shell";
import { ButtonLink } from "@/app/_components/ui";
import { TestClient } from "@/app/dashboard/test/test-client";
import { resolveOnboardingBusinessId } from "../_lib";

/**
 * The "aha" step: run a pretend customer text through the real pipeline
 * (simulation mode) before we ever ask for a card. Same TestClient as
 * /dashboard/test, embedded compact.
 */
export default async function OnboardingTestPage() {
  const businessId = await resolveOnboardingBusinessId();
  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, control_mode")
    .eq("id", businessId)
    .single();

  return (
    <OnboardingShell
      step={1}
      wide
      title="Text your AI like a customer would"
      subtitle="This is exactly what your customers will experience. Nothing here sends a real text."
    >
      <TestClient
        businesses={business ? [business] : []}
        compact
      />
      <div className="mt-6 space-y-3">
        <ButtonLink href="/onboarding/plan" size="lg">
          Continue
        </ButtonLink>
        <p className="text-center">
          <Link href="/onboarding/plan" className="text-sm font-medium text-muted transition-colors hover:text-ink">
            Skip for now
          </Link>
        </p>
      </div>
    </OnboardingShell>
  );
}
