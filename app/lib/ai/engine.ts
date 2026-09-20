import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import { detectEmergencySignal, type EmergencyCategory } from "@/lib/hvac/emergencySignals";
import { getEmergencyScript } from "@/lib/hvac/emergencyScripts";
import { buildBusinessProfileBlock, buildConstitutionBlock } from "./systemPrompt";
import { buildStateSummary, type ConversationContext } from "./context";
import { ALL_TOOLS, executeInfoTool } from "./tools";
import type { AiDecisionMetadata } from "@/lib/supabase/types";

// Sonnet by default while conversation quality is being validated against
// real customers. Once that's proven out, this is the one line to change
// to evaluate a cheaper model (Haiku) for cost at volume — the same
// pattern used elsewhere for well-defined, high-volume, low-complexity
// tasks once accuracy is established.
const MODEL = "claude-sonnet-5";
const MAX_TOOL_ITERATIONS = 6;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
 * then (if clear) a full model turn with tool use, looping until the model
 * calls respond_to_customer or flag_emergency. Does not persist anything —
 * the caller (dev simulator today, the Twilio webhook route later) is
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

  const system = [
    buildConstitutionBlock(),
    buildBusinessProfileBlock(context.business, context.serviceSettings, context.appointmentTypes),
  ];

  const messages: MessageParam[] = context.history.map((m) => ({
    role: m.sender === "customer" ? "user" : "assistant",
    content: m.body,
  }));

  messages.push({
    role: "user",
    content: `${buildStateSummary(context)}\n${inboundText}`,
  });

  const toolContext = { businessId: context.business.id };
  const calledTools: string[] = [];

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system,
      messages,
      tools: ALL_TOOLS,
      tool_choice: { type: "auto" },
    });

    const toolUseBlocks = response.content.filter((block) => block.type === "tool_use");

    const emergencyCall = toolUseBlocks.find((block) => block.name === "flag_emergency");
    if (emergencyCall) {
      const input = emergencyCall.input as { category: EmergencyCategory; evidence_quote: string };
      return {
        decision: buildEmergencyDecision(input.category, context.business.name, fallbackLanguage),
        shortCircuited: true,
        toolCallsThisTurn: calledTools,
      };
    }

    const respondCall = toolUseBlocks.find((block) => block.name === "respond_to_customer");
    if (respondCall) {
      const input = respondCall.input as Omit<AiDecisionMetadata, "emergency_flag" | "tool_calls">;
      return {
        decision: {
          ...input,
          emergency_flag: false,
        },
        shortCircuited: false,
        toolCallsThisTurn: calledTools,
      };
    }

    // Otherwise, execute the info-tool calls and loop with their results.
    if (toolUseBlocks.length === 0) {
      // Model produced only text with no tool call at all — nudge it back
      // toward the required contract rather than silently dropping the turn.
      messages.push({ role: "assistant", content: response.content });
      messages.push({
        role: "user",
        content: "You must call respond_to_customer (or flag_emergency) to finish your turn.",
      });
      continue;
    }

    messages.push({ role: "assistant", content: response.content });
    calledTools.push(...toolUseBlocks.map((block) => block.name));

    const toolResults = await Promise.all(
      toolUseBlocks.map(async (block) => {
        try {
          const result = await executeInfoTool(block.name, block.input as Record<string, unknown>, toolContext);
          return {
            type: "tool_result" as const,
            tool_use_id: block.id,
            content: JSON.stringify(result),
          };
        } catch (err) {
          return {
            type: "tool_result" as const,
            tool_use_id: block.id,
            content: `Error: ${err instanceof Error ? err.message : "tool failed"}`,
            is_error: true,
          };
        }
      }),
    );

    messages.push({ role: "user", content: toolResults });
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
    toolCallsThisTurn: calledTools,
  };
}
