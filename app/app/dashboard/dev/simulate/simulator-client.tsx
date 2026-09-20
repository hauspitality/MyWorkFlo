"use client";

import { useState } from "react";

interface BusinessOption {
  id: string;
  name: string;
  control_mode: string;
}

interface ThreadMessage {
  id: string;
  direction: "inbound" | "outbound";
  sender: "customer" | "ai" | "staff";
  body: string;
  status: string;
  ai_metadata: Record<string, unknown> | null;
  created_at: string;
}

interface SimulateResponse {
  conversationId: string;
  controlMode: string;
  decision: Record<string, unknown>;
  shortCircuited: boolean;
  toolCallsThisTurn: string[];
  actionPlan: Record<string, unknown>;
  thread: ThreadMessage[];
}

const SCENARIOS = [
  { label: "No cooling (routine)", text: "Our AC stopped working today, it's not blowing cold air at all." },
  { label: "Gas smell (emergency)", text: "I smell gas near my furnace, is that dangerous?" },
  { label: "No heat (winter)", text: "Our heat has been out since last night and it's really cold in here." },
  { label: "Spanish: no cooling", text: "El aire acondicionado no está enfriando desde esta mañana." },
];

export function SimulatorClient({ businesses }: { businesses: BusinessOption[] }) {
  const [businessId, setBusinessId] = useState(businesses[0]?.id ?? "");
  const [controlMode, setControlMode] = useState<"draft" | "assisted" | "autopilot">("draft");
  const [phone, setPhone] = useState("+15555550100");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SimulateResponse | null>(null);

  async function seedBusiness() {
    setSeeding(true);
    setError(null);
    try {
      const res = await fetch("/api/dev/seed-business", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to seed dev business");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to seed dev business");
    } finally {
      setSeeding(false);
    }
  }

  function startNewConversation() {
    setConversationId(null);
    setResult(null);
    setPhone(`+1555${String(Date.now()).slice(-7)}`);
  }

  async function send() {
    if (!messageText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dev/simulate-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          conversationId: conversationId ?? undefined,
          controlMode: conversationId ? undefined : controlMode,
          phone,
          body: messageText,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Simulation failed");
      setResult(data);
      setConversationId(data.conversationId);
      setMessageText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setLoading(false);
    }
  }

  if (businesses.length === 0) {
    return (
      <div className="mt-6 rounded-lg border border-line bg-card p-4">
        <p className="text-sm text-ink-soft">
          No business is set up for this account yet. Create a minimal dev test business to start simulating
          conversations.
        </p>
        <button
          onClick={seedBusiness}
          disabled={seeding}
          className="mt-3 rounded-md bg-accent-blue px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {seeding ? "Creating..." : "Create dev test business"}
        </button>
        {error && <p className="mt-2 text-sm text-gauge-red">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-lg border border-line bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-muted">Business</span>
            <select
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              className="w-full rounded-md border border-line bg-paper px-2 py-1.5"
            >
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-muted">
              Control mode {conversationId && "(locked — set on new conversation)"}
            </span>
            <select
              value={controlMode}
              onChange={(e) => setControlMode(e.target.value as typeof controlMode)}
              disabled={Boolean(conversationId)}
              className="w-full rounded-md border border-line bg-paper px-2 py-1.5 disabled:opacity-50"
            >
              <option value="draft">Draft</option>
              <option value="assisted">Assisted</option>
              <option value="autopilot">Autopilot</option>
            </select>
          </label>
        </div>

        <div className="mt-3 flex items-center justify-between text-sm text-muted">
          <span>
            {conversationId ? `Conversation: ${conversationId.slice(0, 8)}... (${phone})` : "No active conversation"}
          </span>
          <button onClick={startNewConversation} className="font-medium text-accent-blue">
            Start new conversation
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-line bg-card p-4">
        <div className="mb-2 flex flex-wrap gap-2">
          {SCENARIOS.map((s) => (
            <button
              key={s.label}
              onClick={() => setMessageText(s.text)}
              className="rounded-full border border-line px-3 py-1 text-xs text-ink-soft hover:border-accent-blue hover:text-accent-blue"
            >
              {s.label}
            </button>
          ))}
        </div>
        <textarea
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="Type a message as the customer..."
          rows={3}
          className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm"
        />
        <button
          onClick={send}
          disabled={loading || !messageText.trim()}
          className="mt-2 rounded-md bg-accent-blue px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send as customer"}
        </button>
        {error && <p className="mt-2 text-sm text-gauge-red">{error}</p>}
      </div>

      {result && (
        <div className="space-y-4">
          <div className="rounded-lg border border-line bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink">Thread</h2>
            <div className="space-y-2">
              {result.thread.map((m) => (
                <div key={m.id} className={m.sender === "customer" ? "text-left" : "text-right"}>
                  <div
                    className={
                      "inline-block max-w-[80%] rounded-lg px-3 py-2 text-sm " +
                      (m.sender === "customer"
                        ? "bg-paper border border-line text-ink"
                        : "bg-accent-blue/10 border border-accent-blue/30 text-ink")
                    }
                  >
                    <p>{m.body}</p>
                    <p className="mt-1 text-[11px] uppercase text-muted">
                      {m.sender} · {m.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-line bg-card p-4">
            <h2 className="mb-2 text-sm font-semibold text-ink">
              Action taken: <span className="text-accent-blue">{String(result.actionPlan.type)}</span>
              {result.shortCircuited && <span className="ml-2 text-gauge-red">(emergency short-circuit)</span>}
            </h2>
            {result.toolCallsThisTurn.length > 0 && (
              <p className="mb-2 text-xs text-muted">Tools called: {result.toolCallsThisTurn.join(", ")}</p>
            )}
            <pre className="overflow-x-auto rounded-md bg-paper p-3 text-xs text-ink-soft">
              {JSON.stringify({ decision: result.decision, actionPlan: result.actionPlan }, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
