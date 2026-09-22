import Link from "next/link";
import { resolveOnboardingBusinessId } from "../_lib";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingDonePage() {
  const businessId = await resolveOnboardingBusinessId();
  const supabase = await createClient();
  const { data: business } = await supabase.from("businesses").select("name").eq("id", businessId).single();

  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-accent-blue/10">
          <svg viewBox="0 0 24 24" className="h-7 w-7 text-accent-blue" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="mb-2 text-xl font-semibold text-ink">
          {business?.name ?? "You"}&rsquo;re set up
        </h1>
        <p className="mb-8 text-sm text-muted">
          A missed call will now get a text back automatically. Connecting your Google Calendar and setting up
          billing are the two things left — you can add both anytime from Settings.
        </p>
        <Link
          href="/dashboard"
          className="flex h-12 w-full items-center justify-center rounded-full bg-accent-blue font-semibold text-white transition-colors hover:bg-accent-blue-deep"
        >
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}
