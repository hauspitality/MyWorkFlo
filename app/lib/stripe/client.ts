import "server-only";
import Stripe from "stripe";
import type { PlanTier } from "@/lib/supabase/types";

/**
 * Lazy singleton Stripe client + env-driven plan/price mapping. Price IDs
 * come from env (STRIPE_PRICE_*) — products are managed in the Stripe
 * dashboard, never created from code. Everything here degrades gracefully
 * when Stripe env vars are unset: callers must gate on isStripeConfigured()
 * before getStripe().
 */

let stripe: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured (STRIPE_SECRET_KEY is unset)");
  }
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
}

const PRICE_ENV_BY_PLAN: Record<PlanTier, string> = {
  starter: "STRIPE_PRICE_STARTER",
  growth: "STRIPE_PRICE_GROWTH",
  pro: "STRIPE_PRICE_PRO",
};

export function priceIdForPlan(plan: PlanTier): string | null {
  return process.env[PRICE_ENV_BY_PLAN[plan]] || null;
}

export function planFromPriceId(priceId: string): PlanTier | null {
  for (const plan of Object.keys(PRICE_ENV_BY_PLAN) as PlanTier[]) {
    const configured = priceIdForPlan(plan);
    if (configured && configured === priceId) return plan;
  }
  return null;
}
