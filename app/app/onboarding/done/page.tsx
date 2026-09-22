import { resolveOnboardingBusinessId } from "../_lib";
import { createClient } from "@/lib/supabase/server";
import { ButtonLink } from "@/app/_components/ui";

export default async function OnboardingDonePage() {
  const businessId = await resolveOnboardingBusinessId();
  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("name, twilio_phone_number")
    .eq("id", businessId)
    .single();

  const phoneConnected = Boolean(business?.twilio_phone_number);

  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-accent-blue/10">
          <svg viewBox="0 0 24 24" className="h-7 w-7 text-accent-blue" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {phoneConnected ? (
          <>
            <h1 className="mb-2 text-xl font-semibold text-ink">
              {business?.name ? `${business.name} is set up` : "You’re set up"}
            </h1>
            <p className="mb-4 text-sm text-muted">
              A missed call will now get a text back automatically. Your calendar connection and plan — like
              everything else you just set up — can be changed anytime from Settings.
            </p>
          </>
        ) : (
          <>
            <h1 className="mb-2 text-xl font-semibold text-ink">
              {business?.name ? `${business.name}’s setup is saved` : "Your setup is saved"}
            </h1>
            <p className="mb-3 text-sm text-muted">
              Your hours, pricing, safety triggers, and control mode are all in place — and you can change any of
              them from Settings.
            </p>
            <p className="mb-4 text-sm text-muted">
              One thing left: your phone line isn&rsquo;t connected yet — until then, nothing texts your
              customers. We&rsquo;ll help you set up call forwarding when your number is ready.
            </p>
          </>
        )}

        <p className="mb-8 text-xs text-muted">
          Text messaging to customers goes live after carrier registration (usually a few days) — required by US
          carriers for business texting.
        </p>

        <div className="space-y-2.5">
          <ButtonLink href="/dashboard" size="lg">
            Go to dashboard
          </ButtonLink>
          <ButtonLink href="/dashboard/test" size="lg" variant="secondary">
            Test your AI
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
