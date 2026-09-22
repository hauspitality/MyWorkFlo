import { NextResponse } from "next/server";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { getStripe, isStripeConfigured, planFromPriceId } from "@/lib/stripe/client";
import type { PlanTier, SubscriptionStatus } from "@/lib/supabase/types";

/**
 * Stripe webhook — public POST endpoint, so every write goes through the
 * service client with explicit business_id scoping, and nothing is trusted
 * until the signature verifies against STRIPE_WEBHOOK_SECRET.
 */

// Stripe's subscription status set is wider than our enum; collapse it.
// paused → past_due (billing interrupted but recoverable), and any status we
// don't recognize (incl. future ones) → canceled: no entitlement by default.
function mapStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
    case "paused":
      return "past_due";
    case "incomplete":
      return "incomplete";
    default:
      // canceled | unpaid | incomplete_expired | unknown
      return "canceled";
  }
}

async function syncSubscription(
  db: SupabaseClient,
  subscription: Stripe.Subscription,
  eventType: string,
  eventCreatedAt: Date,
): Promise<void> {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

  let businessId = subscription.metadata?.business_id || null;
  if (!businessId) {
    const { data } = await db
      .from("businesses")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    businessId = data?.id ?? null;
  }
  // Unattributable subscription (e.g. created directly in the Stripe
  // dashboard against an unknown customer) — nothing to sync, still 200.
  if (!businessId) return;

  const item = subscription.items.data[0];
  if (!item) return;

  // Stripe delivers webhooks with no ordering guarantee: a retried stale
  // .updated arriving after .deleted must not resurrect entitlement. Skip
  // any event not strictly newer than the last one applied.
  const { data: existing } = await db
    .from("subscriptions")
    .select("last_stripe_event_at")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();
  if (existing?.last_stripe_event_at && new Date(existing.last_stripe_event_at) >= eventCreatedAt) {
    await db.from("audit_log").insert({
      business_id: businessId,
      actor_type: "system",
      event_type: "skipped_stale_stripe_event",
      entity_type: "subscription",
      entity_id: null,
      metadata: {
        stripe_event_type: eventType,
        stripe_subscription_id: subscription.id,
        stripe_event_created_at: eventCreatedAt.toISOString(),
        last_stripe_event_at: existing.last_stripe_event_at,
      },
    });
    return;
  }

  const priceId = item.price.id;
  const status = mapStatus(subscription.status);
  // stripe@22 (API 2025-03+) moved current_period_end off Subscription onto
  // each SubscriptionItem — single-price subs, so the first item is the one.
  const currentPeriodEnd = item.current_period_end
    ? new Date(item.current_period_end * 1000).toISOString()
    : null;

  await db.from("subscriptions").upsert(
    {
      business_id: businessId,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      status,
      current_period_end: currentPeriodEnd,
      last_stripe_event_at: eventCreatedAt.toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );

  const businessUpdate: { subscription_status: SubscriptionStatus; plan_tier?: PlanTier } = {
    subscription_status: status,
  };
  const plan = planFromPriceId(priceId);
  if (plan) businessUpdate.plan_tier = plan;
  await db.from("businesses").update(businessUpdate).eq("id", businessId);

  await db.from("audit_log").insert({
    business_id: businessId,
    actor_type: "system",
    event_type: "stripe_subscription_synced",
    entity_type: "subscription",
    // entity_id is uuid; the Stripe id lives in metadata instead.
    entity_id: null,
    metadata: {
      stripe_event_type: eventType,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      status,
      plan_tier: plan,
    },
  });
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!isStripeConfigured() || !webhookSecret) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const db = createServiceClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const businessId = session.metadata?.business_id;
      const customerId =
        typeof session.customer === "string" ? session.customer : session.customer?.id;
      if (businessId && customerId) {
        await db.from("businesses").update({ stripe_customer_id: customerId }).eq("id", businessId);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await syncSubscription(db, event.data.object, event.type, new Date(event.created * 1000));
      break;
    }
    // Unhandled event types are acknowledged so Stripe stops retrying them.
  }

  return NextResponse.json({ received: true });
}
