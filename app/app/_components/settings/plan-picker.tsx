import { Chip } from "@/app/_components/ui";

const PLANS = [
  { plan: "starter", label: "Starter", price: "$119", blurb: "For a single crew getting started with missed-call text-back.", popular: false },
  { plan: "growth", label: "Growth", price: "$299", blurb: "For growing teams that want the AI handling most of the front desk.", popular: true },
  { plan: "pro", label: "Pro", price: "$599", blurb: "For multi-crew operations running on Autopilot.", popular: false },
] as const;

/**
 * Shared between onboarding and Settings so the pricing moment always looks
 * the same. Plain <a> links — the checkout route 307s to Stripe.
 */
export function PlanPicker({ fromOnboarding = false }: { fromOnboarding?: boolean } = {}) {
  return (
    <div className="space-y-2.5">
      {PLANS.map((p) => (
        <a
          key={p.plan}
          href={`/api/billing/checkout?plan=${p.plan}${fromOnboarding ? "&from=onboarding" : ""}`}
          className={
            "block rounded-xl border p-4 transition-colors " +
            (p.popular ? "border-accent-blue bg-accent-blue-soft/40 hover:bg-accent-blue-soft" : "border-line bg-card hover:border-line-strong")
          }
        >
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm font-semibold text-ink">
              {p.label}
              {p.popular && <Chip tone="blue">Most popular</Chip>}
            </span>
            <span className="text-sm font-semibold tabular-nums text-ink">
              {p.price}
              <span className="font-normal text-muted">/mo</span>
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">{p.blurb}</p>
        </a>
      ))}
      <p className="pt-1 text-center text-xs text-muted">Every plan starts with a 14-day free trial. Cancel anytime.</p>
    </div>
  );
}
