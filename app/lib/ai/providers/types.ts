/**
 * Provider-agnostic contract the conversation engine talks to. Each
 * provider (Anthropic, Moonshot) owns its own wire format entirely —
 * message shapes for tool-calling multi-turn loops differ enough between
 * Anthropic's content-block style and OpenAI-compatible tool_calls that
 * trying to unify them into one shared message type would leak one
 * provider's quirks into the other. Instead the boundary is the whole
 * conversation loop: give a provider system text + tool specs + a tool
 * executor, get back a flat outcome engine.ts can handle identically no
 * matter which provider ran it.
 */

export interface ToolSpec {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  strict?: boolean;
}

export interface RawTurnOutcome {
  kind: "emergency" | "respond" | "exhausted";
  /** Present when kind === "emergency" — the flag_emergency tool's raw input. */
  emergencyInput?: Record<string, unknown>;
  /** Present when kind === "respond" — the respond_to_customer tool's raw input. */
  respondInput?: Record<string, unknown>;
  toolCallsThisTurn: string[];
}

export interface ConversationTurnParams {
  systemBlocks: string[];
  history: Array<{ role: "user" | "assistant"; content: string }>;
  latestUserMessage: string;
  tools: ToolSpec[];
  executeTool: (name: string, input: Record<string, unknown>) => Promise<unknown>;
  maxIterations: number;
}

export interface AiProvider {
  readonly name: string;
  runConversationLoop(params: ConversationTurnParams): Promise<RawTurnOutcome>;
}
