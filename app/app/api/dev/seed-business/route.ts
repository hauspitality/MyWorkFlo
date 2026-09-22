import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Dev-only convenience: creates one minimal business (+staff+service_settings
 * +appointment_types+pricing_guidance) for the logged-in user, so the
 * simulator has something real to talk to before the onboarding wizard
 * (Phase 3) exists. Idempotent — returns the existing dev business if the
 * user already has one. Uses the session client throughout: this is an
 * ordinary authenticated write, not an AI-engine/webhook write, so RLS does
 * the tenant-scoping.
 */
export async function POST() {
  // Production gate: onboarding creates real businesses, so this dev seeding
  // shortcut has no production purpose — exposing it would let any signup
  // wedge their own onboarding with a canned "Dev Test HVAC Co.".
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_DEV_SIMULATOR !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: existingStaff } = await supabase
    .from("staff")
    .select("business_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (existingStaff) {
    return NextResponse.json({ businessId: existingStaff.business_id, created: false });
  }

  const slug = `dev-test-${user.id.slice(0, 8)}`;

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .insert({
      owner_user_id: user.id,
      name: "Dev Test HVAC Co.",
      slug,
      timezone: "America/New_York",
      control_mode: "draft",
    })
    .select("id")
    .single();

  if (businessError || !business) {
    return NextResponse.json({ error: businessError?.message ?? "Failed to create dev business" }, { status: 500 });
  }

  const { error: staffError } = await supabase.from("staff").insert({
    business_id: business.id,
    user_id: user.id,
    name: user.email?.split("@")[0] ?? "Owner",
    phone_number: "+15555550000",
    role: "owner",
    is_active: true,
    joined_at: new Date().toISOString(),
  });

  if (staffError) {
    return NextResponse.json({ error: staffError.message }, { status: 500 });
  }

  const { error: settingsError } = await supabase.from("service_settings").insert({
    business_id: business.id,
    business_hours: {
      mon: { open: "08:00", close: "18:00" },
      tue: { open: "08:00", close: "18:00" },
      wed: { open: "08:00", close: "18:00" },
      thu: { open: "08:00", close: "18:00" },
      fri: { open: "08:00", close: "18:00" },
      sat: null,
      sun: null,
    },
    service_area: { type: "zip_list", zips: ["10001"] },
    languages: ["en", "es"],
    ai_persona_name: "Alex",
  });

  if (settingsError) {
    return NextResponse.json({ error: settingsError.message }, { status: 500 });
  }

  const { data: appointmentTypes, error: apptTypeError } = await supabase
    .from("appointment_types")
    .insert([
      {
        business_id: business.id,
        name: "Diagnostic / Service Call",
        duration_minutes: 60,
        auto_bookable: false,
        is_emergency_type: false,
        hvac_issue_codes: [
          "NO_COOLING",
          "NO_HEAT",
          "POOR_AIRFLOW",
          "STRANGE_NOISE",
          "WATER_LEAK",
          "ICE_ON_UNIT",
          "THERMOSTAT_ISSUE",
          "ELECTRICAL_BREAKER",
          "SHORT_CYCLING",
          "WARRANTY_CALLBACK",
          "UNKNOWN_OTHER",
        ],
      },
      {
        business_id: business.id,
        name: "Routine Maintenance Tune-Up",
        duration_minutes: 90,
        auto_bookable: true,
        is_emergency_type: false,
        hvac_issue_codes: ["TUNE_UP_MAINTENANCE"],
      },
    ])
    .select("id, name");

  if (apptTypeError || !appointmentTypes) {
    return NextResponse.json({ error: apptTypeError?.message ?? "Failed to create appointment types" }, { status: 500 });
  }

  const diagnosticType = appointmentTypes.find((t) => t.name === "Diagnostic / Service Call");
  if (diagnosticType) {
    await supabase.from("pricing_guidance").insert({
      business_id: business.id,
      appointment_type_id: diagnosticType.id,
      price_range_min: 89,
      price_range_max: 129,
      display_text: "Diagnostic visits run $89-$129, plus any approved repair cost.",
      is_quotable_by_ai: true,
    });
  }

  return NextResponse.json({ businessId: business.id, created: true });
}
