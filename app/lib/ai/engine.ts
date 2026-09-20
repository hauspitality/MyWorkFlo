import "server-only";
import { detectEmergencySignal, type EmergencyCategory } from "@/lib/hvac/emergencySignals";
import { getEmergencyScript } from "@/lib/hvac/emergencyScripts";
import { buildBusinessProfileBlock, buildConstitutionBlock } from "./systemPrompt";
import { buildStateSummary, type ConversationContext } from "./context";
import { ALL_TOOLS, executeInfoTool } from "./tools";
import { getAiProvider } from "./providers";
import type { AiDecisionMetadata } from "@/lib/supabase/types";

const MAX_TOOL_ITERATIONS = 6;

export interface TurnResult {
  decision: AiDecisionMetadata;
  /** True if this turn was resolved by the emergency pre-filter/flag_emergency, without a full model turn producing a decision the normal way. */
  shortCircuited: boolean;
  /** Names of every info tool actually called this turn — outputGuardrails.ts uses this to verify any price/time claim in reply_text is actually sourced. */
  toolCallsThisTurn: string[];
}

function buildEmergencyDecision(
  category: EmergencyCategory,
  businessName: string,
  language: string,
): AiDecisionMetadata {
  return {
    reply_text: getEmergencyScript(category, businessName),
    language,
    emergency_flag: true,
    emergency_category: category,
    intent: "emergency",
    booking_ready: false,
    needs_human: true,
    needs_human_reason: `Emergency detected: ${category}`,
  };
}

/**
 * Runs one turn of the conversation: Layer 1 deterministic emergency check,
 * then (if clear) a full model turn with tool use via whichever provider is
 * configured (see providers/index.ts), looping until the model calls
 * respond_to_customer or flag_emergency. Does not persist anything — the
 * caller (dev simulator today, the Twilio webhook route later) is
 * responsible for writing messages/audit_log and running decide-action.ts
 * against the returned decision.
 */
export async function runTurn(context: ConversationContext, inboundText: string): Promise<TurnResult> {
  const fallbackLanguage = context.conversation.detected_language ?? "en";

  // Layer 1: deterministic, no LLM call, runs regardless of detected
  // language. This is the real safety backstop — Layer 2 (flag_emergency
  // below) exists for phrasing this list can't anticipate, not instead of it.
  const layer1Match = detectEmergencySignal(inboundText);
  if (layer1Match) {
    return {
      decision: buildEmergencyDecision(layer1Match.category, context.business.name, fallbackLanguage),
      shortCircuited: true,
      toolCallsThisTurn: [],
    };
  }

  const provider = getAiProvider();
  const toolContext = { businessId: context.business.id };

  const outcome = await provider.runConversationLoop({
    systemBlocks: [
      buildConstitutionBlock(),
      buildBusinessProfileBlock(context.business, context.serviceSettings, context.appointmentTypes),
    ],
    history: context.history.map((m) => ({
      role: m.sender === "customer" ? "user" : "assistant",
      content: m.body,
    })),
    latestUserMessage: `${buildStateSummary(context)}\n${inboundText}`,
    tools: ALL_TOOLS,
    executeTool: (name, input) => executeInfoTool(name, input, toolContext),
    maxIterations: MAX_TOOL_ITERATIONS,
  });

  if (outcome.kind === "emergency") {
    const input = outcome.emergencyInput as { category: EmergencyCategory; evidence_quote: string };
    return {
      decision: buildEmergencyDecision(input.category, context.business.name, fallbackLanguage),
      shortCircuited: true,
      toolCallsThisTurn: outcome.toolCallsThisTurn,
    };
  }

  if (outcome.kind === "respond") {
    const input = outcome.respondInput as Omit<AiDecisionMetadata, "emergency_flag" | "tool_calls">;
    return {
      decision: { ...input, emergency_flag: false },
      shortCircuited: false,
      toolCallsThisTurn: outcome.toolCallsThisTurn,
    };
  }

  // Hit the iteration cap without a final decision — fail toward a human
  // rather than looping forever or guessing.
  return {
    decision: {
      reply_text: "Let me get someone from our office to help with this — they'll follow up shortly.",
      language: fallbackLanguage,
      emergency_flag: false,
      intent: "unclear",
      booking_ready: false,
      needs_human: true,
      needs_human_reason: "Exceeded max tool iterations without a final decision.",
    },
    shortCircuited: false,
    toolCallsThisTurn: outcome.toolCallsThisTurn,
  };
}
