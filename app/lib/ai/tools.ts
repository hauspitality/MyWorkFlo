import { createServiceClient } from "@/lib/supabase/service";
import { isWeatherElevated } from "@/lib/weather";
import type { AppointmentType, PricingGuidance, ServiceSettings } from "@/lib/supabase/types";
import type { ToolSpec } from "./providers/types";

/**
 * Tool set for the AI conversation engine. Two categories, deliberately
 * separated:
 *
 * 1. Read-only info tools (get_appointment_types, check_availability,
 *    get_pricing_guidance, get_weather_context) — safe for the model to
 *    call freely. These are the ONLY legitimate source of any price or
 *    time claim; the system prompt forbids stating either without first
 *    calling the relevant tool.
 *
 * 2. flag_emergency — signal-only. When the model calls this, the engine
 *    short-circuits immediately and responds with a locked safety script
 *    (see emergencyScripts.ts), the same as a Layer-1 deterministic match.
 *    It does not cause the model's freeform text to be used.
 *
 * Deliberately NOT included: book_appointment, request_staff_approval,
 * notify_business_emergency. Booking/approval/notification are real,
 * irreversible side effects — they happen in decide-action.ts, driven by
 * the structured respond_to_customer output plus the business's control
 * mode, never as a tool call the model can trigger directly. This keeps
 * "the model's belief that an action is allowed" strictly advisory.
 */

export interface ToolContext {
  businessId: string;
}

const jsonSchema = <T extends Record<string, unknown>>(schema: T) => schema;

export const INFO_TOOLS: ToolSpec[] = [
  {
    name: "get_appointment_types",
    description:
      "Look up this business's real appointment types. Call this before ever mentioning what kinds of visits are available. Each result says whether pricing guidance exists (has_pricing_guidance) but not the actual number — you must call get_pricing_guidance separately before stating any price.",
    input_schema: jsonSchema({
      type: "object",
      properties: {
        issue_code: {
          type: "string",
          description: "Optional HVAC issue code to filter to appointment types relevant to that issue.",
        },
      },
    }),
  },
  {
    name: "check_availability",
    description:
      "Look up real open appointment slots for a given appointment type. This is the ONLY legitimate source of any date/time you mention to the customer — never state a date or arrival window that didn't come from this tool's result.",
    input_schema: jsonSchema({
      type: "object",
      properties: {
        appointment_type_id: { type: "string" },
      },
      required: ["appointment_type_id"],
    }),
  },
  {
    name: "get_pricing_guidance",
    description:
      "Get the approved price range/text for an appointment type. This is the ONLY legitimate source of any dollar figure you mention — never state a price that didn't come from this tool's result. If is_quotable is false, only ever say the technician will quote on-site.",
    input_schema: jsonSchema({
      type: "object",
      properties: {
        appointment_type_id: { type: "string" },
      },
      required: ["appointment_type_id"],
    }),
  },
  {
    name: "get_weather_context",
    description:
      "For NO_COOLING or NO_HEAT issues only: checks whether current outdoor weather crosses this business's urgency threshold (e.g. a heat wave or cold snap). Call this once you've identified the issue as NO_COOLING or NO_HEAT and have a zip code or address to check.",
    input_schema: jsonSchema({
      type: "object",
      properties: {
        issue_code: { type: "string", enum: ["NO_COOLING", "NO_HEAT"] },
        zip: { type: "string" },
      },
      required: ["issue_code", "zip"],
    }),
  },
];

export const FLAG_EMERGENCY_TOOL: ToolSpec = {
  name: "flag_emergency",
  description:
    "Call this IMMEDIATELY if anything in the conversation could plausibly indicate gas, carbon monoxide, fire, sparking, or flooding-near-electrical — even if you're not fully certain. Err toward flagging: a false alarm costs a human a few minutes, a missed signal could cost a life. Do not continue asking qualifying questions once you're calling this — stop and call it now.",
  input_schema: jsonSchema({
    type: "object",
    properties: {
      category: {
        type: "string",
        enum: [
          "GAS_SMELL",
          "CARBON_MONOXIDE_CONCERN",
          "SPARKING_ELECTRICAL",
          "FLOODING_NEAR_ELECTRICAL",
          "BURNING_SMELL_ELECTRICAL",
        ],
      },
      evidence_quote: {
        type: "string",
        description: "The exact customer text that triggered this, for the audit log.",
      },
    },
    required: ["category", "evidence_quote"],
  }),
};

/**
 * The required final tool. Every turn that isn't short-circuited by
 * flag_emergency must end with a call to this — it's the only interface
 * between conversation quality and system behavior. See
 * lib/supabase/types.ts AiDecisionMetadata for the persisted shape this
 * maps onto.
 */
export const RESPOND_TOOL: ToolSpec = {
  name: "respond_to_customer",
  description:
    "Finish your turn by calling this with the message to send the customer and your structured read of the conversation so far. This is required — you must always end by calling this tool (unless you called flag_emergency instead).",
  input_schema: jsonSchema({
    type: "object",
    properties: {
      reply_text: {
        type: "string",
        description:
          "The SMS to send the customer. Short, plain, direct — like a dispatcher texting, not a chatbot. Never include a price or date/time that didn't come from a tool result.",
      },
      language: { type: "string", enum: ["en", "es"] },
      matched_issue_code: {
        type: "string",
        description: "The HVAC issue taxonomy code this conversation matches, or null if not yet determined.",
      },
      collected_fields: {
        type: "object",
        description: "Map of required-field keys to values collected so far (e.g. symptom_onset, equipment_type, service_address).",
        additionalProperties: { type: "string" },
      },
      booking_ready: {
        type: "boolean",
        description: "True only if you have a specific appointment_type_id and a specific slot from check_availability that the customer has agreed to.",
      },
      proposed_appointment_type_id: { type: ["string", "null"] },
      proposed_start: {
        type: ["string", "null"],
        description: "ISO 8601 datetime. Must match a slot returned by check_availability — never invent one.",
      },
      needs_human: {
        type: "boolean",
        description: "True if the conversation is stuck, unclear after several exchanges, or otherwise needs a person regardless of control mode.",
      },
      needs_human_reason: { type: ["string", "null"] },
    },
    required: [
      "reply_text",
      "language",
      "matched_issue_code",
      "collected_fields",
      "booking_ready",
      "proposed_appointment_type_id",
      "proposed_start",
      "needs_human",
      "needs_human_reason",
    ],
  }),
  strict: true,
};

export const ALL_TOOLS: ToolSpec[] = [...INFO_TOOLS, FLAG_EMERGENCY_TOOL, RESPOND_TOOL];

// ============================================================================
// Handlers for the read-only info tools. flag_emergency and
// respond_to_customer are handled specially by the engine, not here.
// ============================================================================

interface AppointmentTypeWithPricingFlag extends AppointmentType {
  // Deliberately a boolean, not the actual price range/display text: this
  // tool must NOT be a legitimate source of a dollar figure, only
  // get_pricing_guidance is (see its description, and outputGuardrails.ts
  // which only whitelists that tool name). A prior version embedded the
  // full pricing_guidance row here, which let the model correctly quote a
  // real price without calling get_pricing_guidance — the guardrail then
  // (correctly, per its own rules) flagged a true, sourced price as
  // unsourced, kicking every pricing-adjacent reply to staff approval.
  has_pricing_guidance: boolean;
}

export async function getAppointmentTypes(
  ctx: ToolContext,
  input: { issue_code?: string },
): Promise<AppointmentTypeWithPricingFlag[]> {
  const supabase = createServiceClient();
  let query = supabase
    .from("appointment_types")
    .select("*, pricing_guidance(*)")
    .eq("business_id", ctx.businessId)
    .eq("is_active", true);

  const { data, error } = await query;
  if (error || !data) return [];

  const rows = data as unknown as Array<AppointmentType & { pricing_guidance: PricingGuidance[] }>;

  const filtered = input.issue_code
    ? rows.filter((row) => row.hvac_issue_codes.includes(input.issue_code!))
    : rows;

  return filtered.map(({ pricing_guidance, ...row }) => ({
    ...row,
    has_pricing_guidance: Boolean(pricing_guidance?.[0]),
  }));
}

export interface AvailabilitySlot {
  start: string; // ISO 8601
  end: string;
  source: "google_calendar" | "simulated";
}

/**
 * Real Google Calendar integration lands in lib/calendar/google.ts
 * (Phase 3/4 per the build plan). Until a business has an active
 * connection, this returns deterministic simulated slots so the
 * conversation engine and dev simulator are fully testable today —
 * the function signature and result shape won't change when the real
 * integration replaces the fallback branch below.
 */
export async function checkAvailability(
  ctx: ToolContext,
  input: { appointment_type_id: string },
): Promise<AvailabilitySlot[]> {
  const supabase = createServiceClient();
  const { data: appointmentType } = await supabase
    .from("appointment_types")
    .select("duration_minutes")
    .eq("id", input.appointment_type_id)
    .eq("business_id", ctx.businessId)
    .single();

  const durationMinutes = appointmentType?.duration_minutes ?? 60;

  const { data: connection } = await supabase
    .from("calendar_connections")
    .select("status")
    .eq("business_id", ctx.businessId)
    .eq("status", "active")
    .maybeSingle();

  if (connection) {
    // TODO(Phase 3/4): replace with a real freebusy.query against Google
    // Calendar via lib/calendar/google.ts. Same return shape.
  }

  return buildSimulatedSlots(durationMinutes);
}

function buildSimulatedSlots(durationMinutes: number): AvailabilitySlot[] {
  const slots: AvailabilitySlot[] = [];
  const now = new Date();

  const windows: Array<{ daysFromNow: number; hour: number }> = [
    { daysFromNow: 1, hour: 10 },
    { daysFromNow: 1, hour: 14 },
    { daysFromNow: 2, hour: 9 },
  ];

  for (const window of windows) {
    const start = new Date(now);
    start.setDate(start.getDate() + window.daysFromNow);
    start.setHours(window.hour, 0, 0, 0);
    const end = new Date(start.getTime() + durationMinutes * 60_000);
    slots.push({ start: start.toISOString(), end: end.toISOString(), source: "simulated" });
  }

  return slots;
}

export async function getPricingGuidance(
  ctx: ToolContext,
  input: { appointment_type_id: string },
): Promise<Pick<PricingGuidance, "display_text" | "is_quotable_by_ai" | "price_range_min" | "price_range_max"> | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("pricing_guidance")
    .select("display_text, is_quotable_by_ai, price_range_min, price_range_max")
    .eq("business_id", ctx.businessId)
    .eq("appointment_type_id", input.appointment_type_id)
    .maybeSingle();

  return data ?? null;
}

export async function getWeatherContext(
  ctx: ToolContext,
  input: { issue_code: "NO_COOLING" | "NO_HEAT"; zip: string },
): Promise<{ elevated: boolean }> {
  const supabase = createServiceClient();
  const { data: settings } = await supabase
    .from("service_settings")
    .select("weather_thresholds")
    .eq("business_id", ctx.businessId)
    .maybeSingle<Pick<ServiceSettings, "weather_thresholds">>();

  const thresholds = settings?.weather_thresholds ?? { no_cooling_high_f: 90, no_heat_low_f: 32 };
  const elevated = await isWeatherElevated(input.issue_code, input.zip, thresholds);
  return { elevated };
}

export async function executeInfoTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<unknown> {
  switch (name) {
    case "get_appointment_types":
      return getAppointmentTypes(ctx, input as { issue_code?: string });
    case "check_availability":
      return checkAvailability(ctx, input as { appointment_type_id: string });
    case "get_pricing_guidance":
      return getPricingGuidance(ctx, input as { appointment_type_id: string });
    case "get_weather_context":
      return getWeatherContext(ctx, input as { issue_code: "NO_COOLING" | "NO_HEAT"; zip: string });
    default:
      throw new Error(`Unknown info tool: ${name}`);
  }
}
