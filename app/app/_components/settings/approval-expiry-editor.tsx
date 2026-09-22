"use client";

import { useState } from "react";
import { Button } from "@/app/_components/ui";

/**
 * Edits service_settings.approval_expiry_minutes — how long a drafted
 * reply waits for staff approval before the customer gets the honest
 * "a person will follow up" fallback. Bounds mirror the server action.
 */
export function ApprovalExpiryEditor({
  initial,
  onSave,
}: {
  initial: number;
  onSave: (minutes: number) => Promise<void>;
}) {
  const [value, setValue] = useState(String(initial));
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const minutes = Number(value);
    if (!Number.isInteger(minutes) || minutes < 5 || minutes > 240) {
      setError("Choose a wait time between 5 and 240 minutes.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(minutes);
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
        When the AI drafts a reply, this is how long it waits for someone on your team to approve it. If the
        time runs out, nothing sends on its own — the customer is told a person will follow up.
      </p>
      <div className="flex items-center gap-2">
        <label htmlFor="approval-expiry-minutes" className="text-sm text-ink-soft">
          Wait up to
        </label>
        <input
          id="approval-expiry-minutes"
          type="number"
          min={5}
          max={240}
          step={5}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-10 w-24 rounded-xl border border-line bg-paper px-3.5 text-sm tabular-nums outline-none transition-colors focus:border-accent-blue/50 focus:bg-card"
        />
        <span className="text-sm text-ink-soft">minutes</span>
      </div>
      {error && <p className="text-sm text-gauge-red">{error}</p>}
      <div className="flex items-center gap-3">
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        {savedFlash && <span className="text-xs font-medium text-gauge-green">Saved ✓</span>}
      </div>
    </div>
  );
}
