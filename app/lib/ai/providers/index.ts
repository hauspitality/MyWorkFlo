import "server-only";
import { createAnthropicProvider } from "./anthropic";
import { createMoonshotProvider } from "./moonshot";
import type { AiProvider } from "./types";

export type { AiProvider, ToolSpec, RawTurnOutcome, ConversationTurnParams } from "./types";

let cached: AiProvider | null = null;

/**
 * Selects the conversation-engine provider. Defaults to Anthropic — the
 * approved build plan's locked stack decision. Set AI_PROVIDER=moonshot to
 * test the pipeline against Kimi K3 instead (e.g. no Anthropic key handy
 * yet); see providers/moonshot.ts for why that's safe to do without
 * weakening any safety guarantee.
 */
export function getAiProvider(): AiProvider {
  if (cached) return cached;
  const choice = process.env.AI_PROVIDER ?? "anthropic";
  cached = choice === "moonshot" ? createMoonshotProvider() : createAnthropicProvider();
  return cached;
}
