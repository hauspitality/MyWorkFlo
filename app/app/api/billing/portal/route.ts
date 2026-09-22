import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";

/**
 * Opens the Stripe customer billing portal for the caller's business —
 * plan changes, card updates, and cancellation all happen there, which is
 * what makes "cancel anytime from Settings" true. GET so a plain
 * <a href="/api/billing/portal"> link works from the settings page — the
 * response is a 303 redirect to Stripe. Only the business owner may manage
 * billing.
 */
export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!isStripeConfigured() || !appUrl) {
    return NextResponse.json({ error: "Billing is not configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: staffRow } = await supabase
    .from("staff")
    .select("business_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!staffRow) {
    return NextResponse.json({ error: "No business found for this account" }, { status: 404 });
  }
  if (staffRow.role !== "owner") {
    return NextResponse.json({ error: "Only the business owner can manage billing" }, { status: 403 });
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id, stripe_customer_id")
    .eq("id", staffRow.business_id)
    .maybeSingle();
  if (!business?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No billing account yet — pick a plan first, then manage it here" },
      { status: 404 }
    );
  }

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: business.stripe_customer_id,
    return_url: `${appUrl}/dashboard/settings`,
  });

  return NextResponse.redirect(session.url, 303);
}
