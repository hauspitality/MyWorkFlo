import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import type {
  AppointmentType,
  Business,
  Conversation,
  Message,
  ServiceSettings,
} from "@/lib/supabase/types";

export interface ConversationContext {
  business: Pick<Business, "id" | "name" | "timezone" | "control_mode">;
  serviceSettings: Pick<
    ServiceSettings,
    "business_hours" | "service_area" | "languages" | "ai_persona_name" | "weather_thresholds" | "emergency_keywords"
  >;
  appointmentTypes: Array<Pick<AppointmentType, "id" | "name" | "duration_minutes" | "hvac_issue_codes" | "auto_bookable">>;
  conversation: Pick<
    Conversation,
    "id" | "business_id" | "control_mode_snapshot" | "collected_fields" | "matched_issue_code" | "turn_count" | "detected_language"
  >;
  history: Array<Pick<Message, "sender" | "body" | "created_at">>;
}

export async function buildConversationContext(conversationId: string): Promise<ConversationContext> {
  const supabase = createServiceClient();

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id, business_id, control_mode_snapshot, collected_fields, matched_issue_code, turn_count, detected_language")
    .eq("id", conversationId)
    .single();

  if (conversationError || !conversation) {
    throw new Error(`Conversation not found: ${conversationId}`);
  }

  const [{ data: business }, { data: serviceSettings }, { data: appointmentTypes }, { data: history }] =
    await Promise.all([
      supabase
        .from("businesses")
        .select("id, name, timezone, control_mode")
        .eq("id", conversation.business_id)
        .single(),
      supabase
        .from("service_settings")
        .select("business_hours, service_area, languages, ai_persona_name, weather_thresholds, emergency_keywords")
        .eq("business_id", conversation.business_id)
        .single(),
      supabase
        .from("appointment_types")
        .select("id, name, duration_minutes, hvac_issue_codes, auto_bookable")
        .eq("business_id", conversation.business_id)
        .eq("is_active", true),
      supabase
        .from("messages")
        .select("sender, body, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true }),
    ]);

  if (!business) throw new Error(`Business not found for conversation ${conversationId}`);
  if (!serviceSettings) throw new Error(`Service settings not found for business ${conversation.business_id}`);

  return {
    business,
    serviceSettings,
    appointmentTypes: appointmentTypes ?? [],
    conversation,
    history: history ?? [],
  };
}

/**
 * Layer C: a compact structured summary of what's already known, injected
 * fresh into the latest user turn every time rather than trusted to raw
 * scrollback. This measurably reduces the model re-asking something the
 * customer already answered — a top complaint pattern in real SMS-bot
 * deployments.
 */
export function buildStateSummary(context: ConversationContext): string {
  const { conversation } = context;
  const fields = Object.entries(conversation.collected_fields)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => `${key}=${value}`)
    .join(", ");

  return [
    `[Known so far: issue=${conversation.matched_issue_code ?? "not yet determined"}`,
    fields ? `, ${fields}` : "",
    `, turn=${conversation.turn_count}]`,
  ].join("");
}
