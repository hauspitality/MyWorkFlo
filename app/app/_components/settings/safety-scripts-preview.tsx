import { SCRIPTS, getEmergencyScript } from "@/lib/hvac/emergencyScripts";
import type { EmergencyCategory } from "@/lib/hvac/emergencySignals";
import { humanizeCode } from "@/lib/format";

/**
 * Read-only preview of the locked, platform-authored safety replies —
 * shown wherever emergency keywords are edited so owners can see exactly
 * what their customers get. The scripts themselves live in
 * lib/hvac/emergencyScripts and are deliberately not editable (see the
 * bright-line policy there). English is rendered here; Spanish-speaking
 * customers automatically receive the Spanish version.
 */

const CATEGORY_LABELS: Record<string, string> = {
  GAS_SMELL: "Gas smell",
  CARBON_MONOXIDE_CONCERN: "Carbon monoxide concern",
  SPARKING_ELECTRICAL: "Sparking or smoking electrical",
  FLOODING_NEAR_ELECTRICAL: "Water near electrical",
  BURNING_SMELL_ELECTRICAL: "Burning smell",
  CUSTOM_TRIGGER: "Your own trigger words",
};

export function SafetyScriptsPreview({ businessName }: { businessName: string }) {
  const categories = Object.keys(SCRIPTS) as EmergencyCategory[];

  return (
    <div>
      <p className="mb-2 text-sm text-muted">
        These exact messages are what your customer receives. They&rsquo;re written with safety reviewers and
        can&rsquo;t be watered down — by you or by us. Customers who text in Spanish automatically get the same
        message in Spanish.
      </p>
      <div className="overflow-hidden rounded-xl border border-line bg-paper">
        {categories.map((category, i) => (
          <details key={category} className={"group " + (i > 0 ? "border-t border-line" : "")}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-card [&::-webkit-details-marker]:hidden">
              {CATEGORY_LABELS[category] ?? humanizeCode(category)}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180"
                aria-hidden
              >
                <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </summary>
            <div className="px-3.5 pb-3.5">
              <div className="max-w-[90%] rounded-2xl rounded-bl-md border border-line bg-card px-3.5 py-2.5 text-sm leading-relaxed text-ink-soft shadow-card">
                &ldquo;{getEmergencyScript(category, businessName, "en")}&rdquo;
              </div>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
