"use client";

import { useState } from "react";
import { Button, Card, CardHeader } from "@/app/_components/ui";
import { humanizeCode } from "@/lib/format";

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

interface Decision {
  matched_issue_code?: string | null;
  collected_fields?: Record<string, string>;
  needs_human_reason?: string | null;
}

interface ActionPlan {
  type: string;
  reason?: string;
}

interface SimulateResponse {
  conversationId: string;
  controlMode: string;
  decision: Decision | null;
  shortCircuited: boolean;
  toolCallsThisTurn: string[];
  actionPlan: ActionPlan;
  thread: ThreadMessage[];
}

const SCENARIOS = [
  { label: "My AC died", text: "Our AC stopped working today, it's not blowing cold air at all." },
  { label: "I smell gas", text: "I smell gas near my furnace, is that dangerous?" },
  { label: "No heat", text: "Our heat has been out since last night and it's really cold in here." },
  { label: "En español", text: "El aire acondicionado no está enfriando desde esta mañana." },
];

type Mode = "draft" | "assisted" | "autopilot";

const MODES: Array<{ value: Mode; label: string; hint: string }> = [
  { value: "draft", label: "Draft", hint: "Every reply waits for your OK before it goes out." },
  { value: "assisted", label: "Assisted", hint: "Replies go out on their own; bookings wait for your OK." },
  { value: "autopilot", label: "Autopilot", hint: "Replies and simple bookings happen on their own." },
];

/** Plain-language names for the qualifying fields the AI gathers. */
const FIELD_LABELS: Record<string, string> = {
  symptom_onset: "when it started",
  equipment_type: "equipment type",
  equipment_age_or_brand: "equipment age or brand",
  error_codes_or_lights: "error codes or lights",
  anyone_home_now: "whether anyone is home",
  service_address: "address",
  preferred_time_window: "preferred time",
  square_footage: "square footage",
};

/** Plain-language names for what each behind-the-scenes lookup checked. */
const TOOL_LABELS: Record<string, string> = {
  get_appointment_types: "your visit types",
  check_availability: "your calendar for open times",
  get_pricing_guidance: "your approved pricing",
  get_weather_context: "the local weather",
};

const MODE_LABEL: Record<string, string> = { draft: "Draft mode", assisted: "Assisted mode", autopilot: "Autopilot mode" };

function describeAction(plan: ActionPlan, controlMode: string): string {
  const mode = MODE_LABEL[controlMode] ?? humanizeCode(controlMode);
  switch (plan.type) {
    case "queue_message_approval":
      return plan.reason?.startsWith("Guardrail")
        ? "held this reply for your approval — a safety rule stopped it from promising a price or time on its own"
        : `held this reply for your approval (${mode})`;
    case "queue_booking_approval":
      return "asked for your OK before booking this appointment";
    case "book_directly":
      return "booked this appointment on its own (Autopilot)";
    case "escalate_priority":
      return "replied, then flagged this conversation for a person to take over";
    case "send_message":
      return `sent this reply on its own (${mode})`;
    case "escalate_emergency":
      return "treated this as an emergency";
    case "duplicate_inbound":
      return "ignored this text because the same message already arrived";
    case "debounced_deferred":
      return "waited because more texts were still coming in — it will answer them together";
    default:
      return humanizeCode(plan.type);
  }
}

function collectedList(decision: Decision | null): string {
  const entries = Object.entries(decision?.collected_fields ?? {}).filter(([, v]) => v != null && v !== "");
  return entries.map(([key]) => FIELD_LABELS[key] ?? humanizeCode(key).toLowerCase()).join(", ");
}

function toolsList(toolCalls: string[]): string {
  return toolCalls
    .filter((name) => TOOL_LABELS[name])
    .map((name) => TOOL_LABELS[name])
    .join(", ");
}

export function TestClient({
  businesses,
  compact = false,
}: {
  businesses: BusinessOption[];
  /**
   * Embedded mode (e.g. the onboarding "Try it" step): drops the page-level
   * controls card — mode toggle and business picker — and the top margin,
   * keeping the scenario chips, conversation thread, and outcome strip.
   */
  compact?: boolean;
}) {
  const [businessId, setBusinessId] = useState(businesses[0]?.id ?? "");
  const initialMode = businesses[0]?.control_mode;
  const [controlMode, setControlMode] = useState<Mode>(
    initialMode === "assisted" || initialMode === "autopilot" ? initialMode : "draft",
  );
  const [phone, setPhone] = useState(`+1555${String(Date.now()).slice(-7)}`);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SimulateResponse | null>(null);

  function startNewTest() {
    setConversationId(null);
    setResult(null);
    setError(null);
    setPhone(`+1555${String(Date.now()).slice(-7)}`);
  }

  async function send() {
    if (!messageText.trim() || loading) return;
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
      if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
      setResult(data);
      setConversationId(data.conversationId);
      setMessageText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const isEmergency = Boolean(result && (result.shortCircuited || result.actionPlan.type === "escalate_emergency"));
  const identified = result?.decision?.matched_issue_code ? humanizeCode(result.decision.matched_issue_code) : "";
  const collected = result ? collectedList(result.decision) : "";
  const checked = result ? toolsList(result.toolCallsThisTurn) : "";
  const activeModeHint = MODES.find((m) => m.value === controlMode)?.hint ?? "";

  return (
    <div className={(compact ? "" : "mt-5 ") + "space-y-4"}>
      {/* Controls */}
      {!compact && (
      <Card className="p-5 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-ink-soft">Try it in:</span>
          <div role="radiogroup" aria-label="Control mode" className="flex flex-wrap gap-2">
            {MODES.map((m) => {
              const active = controlMode === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={Boolean(conversationId)}
                  onClick={() => setControlMode(m.value)}
                  className={
                    "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors disabled:opacity-50 " +
                    (active
                      ? "bg-accent-blue text-white"
                      : "border border-line text-ink-soft hover:bg-paper hover:text-ink")
                  }
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
        <p className="mt-2 text-xs text-muted">
          {conversationId
            ? "The mode is set when a test starts. Start a new test to try a different one."
            : activeModeHint}
        </p>

        {businesses.length > 1 && (
          <label className="mt-3 block text-sm">
            <span className="mb-1 block text-xs text-muted">Business</span>
            <select
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              disabled={Boolean(conversationId)}
              className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink disabled:opacity-50 sm:max-w-xs"
            >
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </Card>
      )}

      {/* Conversation */}
      <Card>
        <CardHeader title="Conversation">
          {conversationId && (
            <button
              type="button"
              onClick={startNewTest}
              className="rounded-full px-3 py-1.5 text-[13px] font-medium text-accent-blue transition-colors hover:bg-paper hover:text-accent-blue-deep"
            >
              Start a new test
            </button>
          )}
        </CardHeader>

        <div className="space-y-2 px-5 pb-4 sm:px-6">
          {!result ? (
            <p className="py-8 text-center text-sm text-muted">
              Pick a scenario below, or type your own message the way a customer would.
            </p>
          ) : (
            result.thread.map((m) => {
              const fromCustomer = m.sender === "customer";
              return (
                <div key={m.id} className={fromCustomer ? "text-left" : "text-right"}>
                  <div
                    className={
                      "inline-block max-w-[85%] rounded-2xl px-3.5 py-2.5 text-left text-sm text-ink sm:max-w-[75%] " +
                      (fromCustomer ? "border border-line bg-paper" : "bg-accent-blue-soft")
                    }
                  >
                    <p>{m.body}</p>
                    <p className="mt-1 text-[11px] text-muted">{fromCustomer ? "You (as the customer)" : "Your AI"}</p>
                    {!fromCustomer && m.status === "queued" && (
                      <p className="mt-0.5 text-[11px] font-medium text-gauge-amber">Draft — would wait for your approval</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Outcome strip */}
        {result && (
          <div className="px-5 pb-4 sm:px-6">
            {isEmergency ? (
              <div className="rounded-xl border border-gauge-red/30 bg-gauge-red-soft px-4 py-3">
                <p className="text-sm font-semibold text-gauge-red">Safety response</p>
                <p className="mt-0.5 text-sm text-ink-soft">
                  This exact pre-written message was sent instantly — in a real conversation your team would be
                  alerted instantly. Emergencies never wait for approval, in any mode.
                </p>
              </div>
            ) : (
              <div className="rounded-xl bg-paper px-4 py-3">
                <p className="text-sm text-ink-soft">
                  <span className="font-semibold text-ink">What the AI did:</span> {describeAction(result.actionPlan, result.controlMode)}
                  {identified && (
                    <>
                      {" · "}
                      <span className="font-semibold text-ink">It identified:</span> {identified}
                    </>
                  )}
                  {collected && (
                    <>
                      {" · "}
                      <span className="font-semibold text-ink">It collected:</span> {collected}
                    </>
                  )}
                  {checked && (
                    <>
                      {" · "}
                      <span className="font-semibold text-ink">It checked:</span> {checked}
                    </>
                  )}
                </p>
              </div>
            )}
            <details className="mt-2">
              <summary className="cursor-pointer text-xs font-medium text-muted transition-colors hover:text-ink">
                Show details
              </summary>
              <pre className="mt-2 overflow-x-auto rounded-xl bg-paper p-3 text-xs text-ink-soft">
                {JSON.stringify({ decision: result.decision, actionPlan: result.actionPlan }, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/* Composer */}
        <div className="border-t border-line px-5 py-4 sm:px-6">
          <div className="mb-3 flex flex-wrap gap-2">
            {SCENARIOS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => setMessageText(s.text)}
                className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-accent-blue/50 hover:text-accent-blue"
              >
                {s.label}
              </button>
            ))}
          </div>
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Type what a customer might text…"
            aria-label="Message to send as the customer"
            rows={2}
            className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-faint focus:border-accent-blue/50"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-xs text-muted">
              Test conversations show up in your Leads and Approvals, just like real ones.
            </p>
            <Button onClick={send} disabled={loading || !messageText.trim()} className="shrink-0">
              {loading ? "Sending…" : "Send as the customer"}
            </Button>
          </div>
          {error && <p className="mt-2 text-sm text-gauge-red">{error}</p>}
        </div>
      </Card>
    </div>
  );
}
