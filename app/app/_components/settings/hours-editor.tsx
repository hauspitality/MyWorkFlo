"use client";

import { useState } from "react";
import { Button } from "@/app/_components/ui";
import type { BusinessHours } from "@/lib/supabase/types";

const DAYS: Array<{ key: string; label: string }> = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

const DEFAULT_OPEN = "08:00";
const DEFAULT_CLOSE = "18:00";

const TIME_INPUT =
  "h-10 w-full rounded-xl border border-line bg-paper px-2.5 text-sm tabular-nums outline-none transition-colors focus:border-accent-blue/50 focus:bg-card";

export function HoursEditor({
  initial,
  onSave,
  submitLabel = "Save",
}: {
  initial: BusinessHours;
  onSave: (hours: BusinessHours) => Promise<void>;
  submitLabel?: string;
}) {
  const [hours, setHours] = useState<BusinessHours>(initial);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleDay(key: string, closed: boolean) {
    setHours((prev) => ({ ...prev, [key]: closed ? null : { open: DEFAULT_OPEN, close: DEFAULT_CLOSE } }));
  }

  function setTime(key: string, field: "open" | "close", value: string) {
    setHours((prev) => {
      const day = prev[key];
      if (!day) return prev;
      return { ...prev, [key]: { ...day, [field]: value } };
    });
  }

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      await onSave(hours);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save hours");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2.5">
      {DAYS.map((day) => {
        const value = hours[day.key];
        return (
          <div key={day.key} className="flex min-h-12 items-center gap-3 rounded-xl border border-line bg-card px-3.5 py-2">
            <span className="w-20 shrink-0 text-sm font-medium text-ink sm:w-24">{day.label}</span>
            <label className="flex shrink-0 cursor-pointer items-center gap-1.5 py-2 text-xs text-muted">
              <input type="checkbox" className="h-4 w-4" checked={!value} onChange={(e) => toggleDay(day.key, e.target.checked)} />
              Closed
            </label>
            {value && (
              <div className="flex flex-1 items-center gap-2">
                <input
                  type="time"
                  value={value.open}
                  onChange={(e) => setTime(day.key, "open", e.target.value)}
                  aria-label={`${day.label} opening time`}
                  className={TIME_INPUT}
                />
                <span className="text-xs text-muted">to</span>
                <input
                  type="time"
                  value={value.close}
                  onChange={(e) => setTime(day.key, "close", e.target.value)}
                  aria-label={`${day.label} closing time`}
                  className={TIME_INPUT}
                />
              </div>
            )}
          </div>
        );
      })}
      {error && <p className="text-sm text-gauge-red">{error}</p>}
      <div className="flex items-center gap-3 pt-1">
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? "Saving…" : submitLabel}
        </Button>
        {savedFlash && <span className="text-xs font-medium text-gauge-green">Saved ✓</span>}
      </div>
    </div>
  );
}
