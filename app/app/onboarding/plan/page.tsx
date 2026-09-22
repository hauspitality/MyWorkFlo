import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { OnboardingShell } from "@/app/_components/settings/onboarding-shell";
import { PlanPicker } from "@/app/_components/settings/plan-picker";
import { resolveOnboardingBusinessId } from "../_lib";

export default async function OnboardingPlanPage() {
  const businessId = await resolveOnboardingBusinessId();
  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("subscription_status")
    .eq("id", businessId)
    .single();

  const status = business?.subscription_status;
  const subscribed = status === "active" || status === "trialing";
  // Cheap presence check only — the checkout route does the full config
  // validation and 503s; this just avoids sending users to a dead link.
  const billingLive = Boolean(process.env.STRIPE_SECRET_KEY);

  return (
    <OnboardingShell
      step={2}
      title="Pick a plan"
      subtitle={
        subscribed || !billingLive
          ? "Change or cancel anytime from Settings."
          : "Pick a plan to keep going — every plan starts with a 14-day free trial. Your card isn't charged until day 15."
      }
    >
      {subscribed ? (
        <div className="space-y-6">
          <div className="flex items-center gap-2 rounded-md border border-line bg-paper px-3 py-2.5 text-sm text-ink-soft">
            <span className="h-2 w-2 shrink-0 rounded-full bg-gauge-green" />
            {status === "trialing" ? "Your trial is active — you're all set." : "Your subscription is active — you're all set."}
          </div>
          <Link
            href="/onboarding/hours"
            className="flex h-12 w-full items-center justify-center rounded-full bg-accent-blue font-semibold text-white transition-colors hover:bg-accent-blue-deep"
          >
            Continue
          </Link>
        </div>
      ) : billingLive ? (
        // A real gate: no skip path when billing is live — the card comes
        // before anything that costs money, and the trial keeps it free.
        <PlanPicker fromOnboarding />
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-ink-soft">Billing isn&rsquo;t live yet — you&rsquo;re on the house for now.</p>
          <Link
            href="/onboarding/hours"
            className="flex h-12 w-full items-center justify-center rounded-full bg-accent-blue font-semibold text-white transition-colors hover:bg-accent-blue-deep"
          >
            Continue
          </Link>
        </div>
      )}
      <p className="mt-6 text-xs text-muted">
        Text messaging to customers goes live after carrier registration (usually a few days) — required by US
        carriers for business texting.
      </p>
    </OnboardingShell>
  );
}
