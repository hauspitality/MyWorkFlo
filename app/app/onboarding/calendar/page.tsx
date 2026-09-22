import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { OnboardingShell } from "@/app/_components/settings/onboarding-shell";
import { resolveOnboardingBusinessId } from "../_lib";
import { isGoogleCalendarConfigured } from "@/lib/calendar/google";

export default async function OnboardingCalendarPage() {
  const businessId = await resolveOnboardingBusinessId();
  const supabase = await createClient();
  const { data: connection } = await supabase
    .from("calendar_connections")
    .select("status")
    .eq("business_id", businessId)
    .eq("status", "active")
    .maybeSingle();

  const connected = Boolean(connection);
  const configured = isGoogleCalendarConfigured();

  return (
    <OnboardingShell
      step={6}
      title="Connect your calendar"
      subtitle="Availability and bookings come straight from your Google Calendar."
    >
      {connected ? (
        <div className="space-y-6">
          <div className="flex items-center gap-2 rounded-md border border-line bg-paper px-3 py-2.5 text-sm text-ink-soft">
            <span className="h-2 w-2 shrink-0 rounded-full bg-gauge-green" />
            Google Calendar is connected. The AI offers real openings and puts bookings on your calendar.
          </div>
          <Link
            href="/onboarding/plan"
            className="flex h-12 w-full items-center justify-center rounded-full bg-accent-blue font-semibold text-white transition-colors hover:bg-accent-blue-deep"
          >
            Continue
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-ink-soft">
            {configured
              ? "Until it's connected, the AI offers simulated availability and bookings wait on staff approval. Connecting takes under a minute — you'll land in Settings afterward, and this step will show as done."
              : "Google Calendar isn't configured for this environment yet. You can connect it later from Settings — until then the AI offers simulated availability."}
          </p>
          {configured && (
            <a
              href="/api/calendar/google/connect"
              className="flex h-12 w-full items-center justify-center rounded-full bg-accent-blue font-semibold text-white transition-colors hover:bg-accent-blue-deep"
            >
              Connect Google Calendar
            </a>
          )}
          <p className="text-center">
            <Link href="/onboarding/plan" className="text-sm font-medium text-muted transition-colors hover:text-ink">
              {configured ? "I'll do this later" : "Skip for now"}
            </Link>
          </p>
        </div>
      )}
    </OnboardingShell>
  );
}
