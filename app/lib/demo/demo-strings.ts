import { missedCallOpener } from "@/lib/messaging/customer-strings";

/**
 * The text a prospect receives when they run the demo. It is the REAL
 * missed-call opener (so they see exactly what their own customer would get),
 * followed by one framing line addressed to them and the trial link. One
 * STOP notice total — the opener already carries it, so the framing line
 * doesn't repeat it.
 */
export function demoTextBack(params: { businessName?: string | null; trialUrl: string }): string {
  const name = params.businessName?.trim() || "your HVAC company";
  // missedCallOpener already ends with "Reply STOP to opt out."
  const opener = missedCallOpener(name, "en");
  return (
    `${opener}\n\n` +
    `👆 That's the text MyWorkFlo sends your customers within seconds of a missed call — ` +
    `so the job doesn't go to the next contractor. Turn it on for your shop (free 14-day trial): ${params.trialUrl}`
  );
}

/** Where "Start your free trial" points — Google/email sign-in, then onboarding. */
export function trialUrl(): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "https://app.myworkflo.com").replace(/\/$/, "");
  return `${base}/login?next=/onboarding`;
}
