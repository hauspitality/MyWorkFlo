"use client";

import { useState } from "react";
import { Button } from "@/app/_components/ui";
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
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      await onSave(mode);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
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
      <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Control mode">
        {MODES.map((m) => (
          <button
            key={m.value}
            role="radio"
            aria-checked={mode === m.value}
            onClick={() => setMode(m.value)}
            className={
              "rounded-xl border p-4 text-left transition-colors " +
              (mode === m.value ? "border-accent-blue bg-accent-blue-soft" : "border-line bg-card hover:border-line-strong")
            }
          >
            <div className="mb-1 flex items-center gap-2">
              <span
                className={
                  "h-2.5 w-2.5 shrink-0 rounded-full " + (mode === m.value ? "bg-accent-blue" : "bg-line-strong")
                }
              />
              <span className="text-sm font-semibold text-ink">{m.title}</span>
            </div>
            <p className="text-xs text-ink-soft">{m.description}</p>
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-gauge-red">{error}</p>}
      <div className="flex items-center gap-3">
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? "Saving…" : submitLabel}
        </Button>
        {savedFlash && <span className="text-xs font-medium text-gauge-green">Saved ✓</span>}
      </div>
    </div>
  );
}
