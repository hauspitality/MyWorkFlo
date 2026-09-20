import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import type { AiProvider, ConversationTurnParams, RawTurnOutcome, ToolSpec } from "./types";

// Sonnet by default while conversation quality is being validated against
// real customers. Once that's proven out, this is the one line to change
// to evaluate a cheaper model (Haiku) for cost at volume.
const MODEL = "claude-sonnet-5";

function toAnthropicTools(tools: ToolSpec[]): Anthropic.Tool[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema,
    ...(t.strict ? { strict: t.strict } : {}),
  })) as Anthropic.Tool[];
}

export function createAnthropicProvider(): AiProvider {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  return {
    name: "anthropic",
    async runConversationLoop(params: ConversationTurnParams): Promise<RawTurnOutcome> {
      const { systemBlocks, history, latestUserMessage, tools, executeTool, maxIterations } = params;

      // Layer A/B system blocks are cached here (Anthropic-specific prompt
      // caching) — this optimization has no Moonshot equivalent, so it
      // stays local to this provider rather than leaking into systemPrompt.ts.
      const system: Anthropic.TextBlockParam[] = systemBlocks.map((text) => ({
        type: "text",
        text,
        cache_control: { type: "ephemeral" },
      }));

      const messages: MessageParam[] = history.map((m) => ({ role: m.role, content: m.content }));
      messages.push({ role: "user", content: latestUserMessage });

      const anthropicTools = toAnthropicTools(tools);
      const calledTools: string[] = [];

      for (let iteration = 0; iteration < maxIterations; iteration++) {
        const response = await anthropic.messages.create({
          model: MODEL,
          max_tokens: 1024,
          system,
          messages,
          tools: anthropicTools,
          tool_choice: { type: "auto" },
        });

        const toolUseBlocks = response.content.filter((block) => block.type === "tool_use");

        const emergencyCall = toolUseBlocks.find((block) => block.name === "flag_emergency");
        if (emergencyCall) {
          return {
            kind: "emergency",
            emergencyInput: emergencyCall.input as Record<string, unknown>,
            toolCallsThisTurn: calledTools,
          };
        }

        const respondCall = toolUseBlocks.find((block) => block.name === "respond_to_customer");
        if (respondCall) {
          return {
            kind: "respond",
            respondInput: respondCall.input as Record<string, unknown>,
            toolCallsThisTurn: calledTools,
          };
        }

        if (toolUseBlocks.length === 0) {
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
              const result = await executeTool(block.name, block.input as Record<string, unknown>);
              return { type: "tool_result" as const, tool_use_id: block.id, content: JSON.stringify(result) };
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

      return { kind: "exhausted", toolCallsThisTurn: calledTools };
    },
  };
}
