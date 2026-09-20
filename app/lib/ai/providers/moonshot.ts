import "server-only";
import type { AiProvider, ConversationTurnParams, RawTurnOutcome, ToolSpec } from "./types";

/**
 * Moonshot's Kimi K3 via its OpenAI-compatible Chat Completions endpoint —
 * an alternate provider for cost-testing the conversation pipeline without
 * an Anthropic key. Not the production default (see providers/index.ts):
 * the approved build plan locked in Anthropic Claude, and this project's
 * safety backstops (Layer 1 emergency regex, output guardrails,
 * decide-action.ts) are all plain code that runs the same regardless of
 * which model drafted the reply — provider choice here only affects
 * conversation quality, not safety.
 */

const BASE_URL = process.env.MOONSHOT_BASE_URL ?? "https://api.moonshot.ai/v1";
const MODEL = process.env.MOONSHOT_MODEL ?? "kimi-k3";

interface OpenAiToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface OpenAiMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: OpenAiToolCall[];
  tool_call_id?: string;
}

function toOpenAiTools(tools: ToolSpec[]) {
  return tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
      ...(t.strict ? { strict: true } : {}),
    },
  }));
}

function parseArguments(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

async function chatCompletion(
  apiKey: string,
  messages: OpenAiMessage[],
  tools: ReturnType<typeof toOpenAiTools>,
): Promise<{ choices: Array<{ message: OpenAiMessage }> }> {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    // Kimi K3 is an always-on reasoning model — it only accepts temperature 1.
    body: JSON.stringify({ model: MODEL, temperature: 1, messages, tools, tool_choice: "auto" }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Moonshot API error ${res.status}: ${text.slice(0, 500)}`);
  }

  return res.json();
}

export function createMoonshotProvider(): AiProvider {
  const apiKey = process.env.MOONSHOT_API_KEY;
  if (!apiKey) {
    throw new Error("MOONSHOT_API_KEY is not set");
  }

  return {
    name: "moonshot",
    async runConversationLoop(params: ConversationTurnParams): Promise<RawTurnOutcome> {
      const { systemBlocks, history, latestUserMessage, tools, executeTool, maxIterations } = params;

      const messages: OpenAiMessage[] = [
        { role: "system", content: systemBlocks.join("\n\n") },
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: latestUserMessage },
      ];

      const openAiTools = toOpenAiTools(tools);
      const calledTools: string[] = [];

      for (let iteration = 0; iteration < maxIterations; iteration++) {
        const data = await chatCompletion(apiKey, messages, openAiTools);
        const message = data.choices[0]?.message;
        if (!message) throw new Error("Moonshot returned no choices");

        const toolCalls = message.tool_calls ?? [];

        const emergencyCall = toolCalls.find((c) => c.function.name === "flag_emergency");
        if (emergencyCall) {
          return {
            kind: "emergency",
            emergencyInput: parseArguments(emergencyCall.function.arguments),
            toolCallsThisTurn: calledTools,
          };
        }

        const respondCall = toolCalls.find((c) => c.function.name === "respond_to_customer");
        if (respondCall) {
          return {
            kind: "respond",
            respondInput: parseArguments(respondCall.function.arguments),
            toolCallsThisTurn: calledTools,
          };
        }

        if (toolCalls.length === 0) {
          messages.push(message);
          messages.push({
            role: "user",
            content: "You must call respond_to_customer (or flag_emergency) to finish your turn.",
          });
          continue;
        }

        messages.push(message);
        calledTools.push(...toolCalls.map((c) => c.function.name));

        for (const call of toolCalls) {
          let content: string;
          try {
            const result = await executeTool(call.function.name, parseArguments(call.function.arguments));
            content = JSON.stringify(result);
          } catch (err) {
            content = `Error: ${err instanceof Error ? err.message : "tool failed"}`;
          }
          messages.push({ role: "tool", tool_call_id: call.id, content });
        }
      }

      return { kind: "exhausted", toolCallsThisTurn: calledTools };
    },
  };
}
