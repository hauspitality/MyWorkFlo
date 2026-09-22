import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, isStripeConfigured, priceIdForPlan } from "@/lib/stripe/client";

/**
 * Starts a Stripe Checkout subscription for the caller's business.
 * GET so plain <a href="/api/billing/checkout?plan=growth"> links work from
 * the settings/pricing pages — the response is a 303 redirect to Stripe.
 * Only the business owner (staff.role = 'owner') may start billing.
 */
export async function GET(request: Request) {
  const plan = new URL(request.url).searchParams.get("plan");
  if (plan !== "starter" && plan !== "growth" && plan !== "pro") {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const priceId = priceIdForPlan(plan);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!isStripeConfigured() || !priceId || !appUrl) {
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
  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const stripe = getStripe();

  let customerId: string | null = business.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { business_id: business.id },
    });
    customerId = customer.id;
    // Best-effort persist; the checkout.session.completed webhook also sets
    // this via the service client, so an RLS hiccup here is recoverable.
    await supabase.from("businesses").update({ stripe_customer_id: customerId }).eq("id", business.id);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard/settings?billing=success`,
    cancel_url: `${appUrl}/dashboard/settings?billing=canceled`,
    metadata: { business_id: business.id },
    // Mirrored onto the subscription so the webhook can resolve the tenant
    // without a customer-id lookup.
    subscription_data: { metadata: { business_id: business.id } },
  });

  if (!session.url) {
    return NextResponse.json({ error: "Stripe did not return a checkout URL" }, { status: 502 });
  }
  return NextResponse.redirect(session.url, 303);
}
