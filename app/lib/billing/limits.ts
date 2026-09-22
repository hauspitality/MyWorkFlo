/**
 * Plan-tier limits, kept in one place so the UI copy ("Your plan includes
 * N staff members") and the server-side enforcement can never drift apart.
 * Client-safe — no server-only imports.
 */

/** How many active staff seats (owner included) each plan includes. */
export function staffSeatLimit(planTier: "starter" | "growth" | "pro" | null): number {
  switch (planTier) {
    case "growth":
      return 10;
    case "pro":
      return 50;
    case "starter":
    default:
      return 2;
  }
}
