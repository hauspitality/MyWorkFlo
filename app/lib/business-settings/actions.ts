"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizePhoneE164 } from "@/lib/twilio/client";
import type { BusinessHours, ControlMode, ServiceArea } from "@/lib/supabase/types";

/**
 * Shared by both the onboarding wizard and /dashboard/settings — both are
 * "edit this business's config" screens, just at different points in time
 * (first-run vs. ongoing). All use the session client, so RLS does the
 * tenant-scoping; every action still resolves "which business" from the
 * current user's own staff row rather than trusting a client-supplied id.
 */

export async function requireStaffBusinessId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: staff, error } = await supabase
    .from("staff")
    .select("business_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!staff) throw new Error("No business set up for this account yet");
  return staff.business_id;
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${base || "business"}-${Date.now().toString(36)}`;
}

/**
 * Onboarding step 1. Idempotent — if this user already has a business
 * (e.g. they refreshed or hit back), returns the existing id instead of
 * creating a second one.
 */
export async function createBusinessAndSeed(input: {
  name: string;
  timezone: string;
  ownerName: string;
  ownerPhone: string;
}): Promise<{ businessId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: existing } = await supabase
    .from("staff")
    .select("business_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (existing) return { businessId: existing.business_id };

  // Stored E.164 so the SMS webhook's staff-detection (which compares
  // against Twilio's E.164 From) can match this number. Validate before
  // creating anything so a bad phone never leaves a half-seeded business.
  const ownerPhone = normalizePhoneE164(input.ownerPhone);
  if (!ownerPhone) throw new Error("Enter a valid US phone number");

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .insert({
      owner_user_id: user.id,
      name: input.name,
      slug: slugify(input.name),
      timezone: input.timezone,
      control_mode: "draft",
    })
    .select("id")
    .single();
  if (businessError || !business) throw new Error(businessError?.message ?? "Failed to create business");
  const businessId = business.id;

  const { error: staffError } = await supabase.from("staff").insert({
    business_id: businessId,
    user_id: user.id,
    name: input.ownerName,
    phone_number: ownerPhone,
    role: "owner",
    is_active: true,
    joined_at: new Date().toISOString(),
  });
  if (staffError) throw new Error(staffError.message);

  const { error: settingsError } = await supabase.from("service_settings").insert({
    business_id: businessId,
    business_hours: {
      mon: { open: "08:00", close: "18:00" },
      tue: { open: "08:00", close: "18:00" },
      wed: { open: "08:00", close: "18:00" },
      thu: { open: "08:00", close: "18:00" },
      fri: { open: "08:00", close: "18:00" },
      sat: null,
      sun: null,
    },
    service_area: { type: "zip_list", zips: [] },
    languages: ["en", "es"],
  });
  if (settingsError) throw new Error(settingsError.message);

  const { data: apptTypes, error: apptError } = await supabase
    .from("appointment_types")
    .insert([
      {
        business_id: businessId,
        name: "Diagnostic / Service Call",
        duration_minutes: 60,
        auto_bookable: false,
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
        business_id: businessId,
        name: "Routine Maintenance Tune-Up",
        duration_minutes: 90,
        auto_bookable: true,
        hvac_issue_codes: ["TUNE_UP_MAINTENANCE"],
      },
    ])
    .select("id, name");
  if (apptError || !apptTypes) throw new Error(apptError?.message ?? "Failed to create appointment types");

  const diagnostic = apptTypes.find((t) => t.name === "Diagnostic / Service Call");
  if (diagnostic) {
    await supabase.from("pricing_guidance").insert({
      business_id: businessId,
      appointment_type_id: diagnostic.id,
      price_range_min: 89,
      price_range_max: 129,
      display_text: "Diagnostic visits run $89-$129, plus any approved repair cost.",
      is_quotable_by_ai: true,
    });
  }

  return { businessId };
}

export async function updateBusinessHours(hours: BusinessHours): Promise<void> {
  const businessId = await requireStaffBusinessId();
  const supabase = await createClient();
  const { error } = await supabase.from("service_settings").update({ business_hours: hours }).eq("business_id", businessId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/settings");
}

export async function updateServiceArea(area: ServiceArea): Promise<void> {
  const businessId = await requireStaffBusinessId();
  const supabase = await createClient();
  const { error } = await supabase.from("service_settings").update({ service_area: area }).eq("business_id", businessId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/settings");
}

export interface AppointmentTypeInput {
  id?: string;
  name: string;
  duration_minutes: number;
  auto_bookable: boolean;
  hvac_issue_codes: string[];
  pricing: { price_range_min: number | null; price_range_max: number | null; display_text: string; is_quotable_by_ai: boolean } | null;
}

export async function upsertAppointmentType(input: AppointmentTypeInput): Promise<{ id: string }> {
  const businessId = await requireStaffBusinessId();
  const supabase = await createClient();

  let appointmentTypeId: string;
  if (input.id) {
    const { error } = await supabase
      .from("appointment_types")
      .update({
        name: input.name,
        duration_minutes: input.duration_minutes,
        auto_bookable: input.auto_bookable,
        hvac_issue_codes: input.hvac_issue_codes,
      })
      .eq("id", input.id)
      .eq("business_id", businessId);
    if (error) throw new Error(error.message);
    appointmentTypeId = input.id;
  } else {
    const { data, error } = await supabase
      .from("appointment_types")
      .insert({
        business_id: businessId,
        name: input.name,
        duration_minutes: input.duration_minutes,
        auto_bookable: input.auto_bookable,
        hvac_issue_codes: input.hvac_issue_codes,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Failed to create appointment type");
    appointmentTypeId = data.id;
  }

  if (input.pricing) {
    const { error } = await supabase.from("pricing_guidance").upsert(
      {
        business_id: businessId,
        appointment_type_id: appointmentTypeId,
        price_range_min: input.pricing.price_range_min,
        price_range_max: input.pricing.price_range_max,
        display_text: input.pricing.display_text,
        is_quotable_by_ai: input.pricing.is_quotable_by_ai,
      },
      { onConflict: "appointment_type_id" },
    );
    if (error) throw new Error(error.message);
  }

  revalidatePath("/dashboard/settings");
  return { id: appointmentTypeId };
}

export async function deleteAppointmentType(id: string): Promise<void> {
  const businessId = await requireStaffBusinessId();
  const supabase = await createClient();
  const { error } = await supabase.from("appointment_types").update({ is_active: false }).eq("id", id).eq("business_id", businessId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/settings");
}

export async function updateEmergencyKeywords(keywords: string[]): Promise<void> {
  const businessId = await requireStaffBusinessId();
  const supabase = await createClient();
  const { error } = await supabase
    .from("service_settings")
    .update({ emergency_keywords: keywords.filter((k) => k.trim().length > 0) })
    .eq("business_id", businessId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/settings");
}

export async function updateControlMode(mode: ControlMode): Promise<void> {
  const businessId = await requireStaffBusinessId();
  const supabase = await createClient();
  const { error } = await supabase.from("businesses").update({ control_mode: mode }).eq("id", businessId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/settings");
}
