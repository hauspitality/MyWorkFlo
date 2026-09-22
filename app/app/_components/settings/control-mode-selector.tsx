"use client";

import { useState } from "react";
import type { ControlMode } from "@/lib/supabase/types";

const MODES: Array<{ value: ControlMode; title: string; description: string }> = [
  {
    value: "draft",
    title: "Draft",
    description: "The AI drafts every reply, but your team taps approve before anything sends. Full control, slower.",
  },
  {
    value: "assisted",
    title: "Assisted",
    description:
      "The AI sends routine replies on its own. Anything involving a real booking or that it's unsure about still waits for your approval.",
  },
  {
    value: "autopilot",
    title: "Autopilot",
    description:
      "The AI handles the whole conversation end-to-end, including booking directly onto your calendar when it's confident. Fastest, least hands-on.",
  },
];

export function ControlModeSelector({
  initial,
  onSave,
  submitLabel = "Save",
}: {
  initial: ControlMode;
  onSave: (mode: ControlMode) => Promise<void>;
  submitLabel?: string;
}) {
  const [mode, setMode] = useState<ControlMode>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      await onSave(mode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        No matter which mode you pick, safety emergencies always send an instant, pre-approved reply and notify
        you immediately — this setting never affects that.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => setMode(m.value)}
            className={
              "rounded-lg border p-4 text-left transition-colors " +
              (mode === m.value ? "border-accent-blue bg-accent-blue/5" : "border-line bg-card hover:border-accent-blue/50")
            }
          >
            <div className="mb-1 flex items-center gap-2">
              <span
                className={
                  "h-2.5 w-2.5 shrink-0 rounded-full " + (mode === m.value ? "bg-accent-blue" : "bg-line-strong")
                }
              />
              <span className="font-semibold text-ink">{m.title}</span>
            </div>
            <p className="text-xs text-ink-soft">{m.description}</p>
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-gauge-red">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={saving}
        className="rounded-md bg-accent-blue px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? "Saving..." : submitLabel}
      </button>
    </div>
  );
}
