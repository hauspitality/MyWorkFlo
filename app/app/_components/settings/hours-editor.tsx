"use client";

import { useState } from "react";
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save hours");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {DAYS.map((day) => {
        const value = hours[day.key];
        return (
          <div key={day.key} className="flex items-center gap-3 rounded-md border border-line bg-card px-3 py-2">
            <span className="w-24 shrink-0 text-sm text-ink">{day.label}</span>
            <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted">
              <input type="checkbox" checked={!value} onChange={(e) => toggleDay(day.key, e.target.checked)} />
              Closed
            </label>
            {value && (
              <div className="flex flex-1 items-center gap-2">
                <input
                  type="time"
                  value={value.open}
                  onChange={(e) => setTime(day.key, "open", e.target.value)}
                  className="w-full rounded border border-line bg-paper px-2 py-1 text-sm"
                />
                <span className="text-muted">to</span>
                <input
                  type="time"
                  value={value.close}
                  onChange={(e) => setTime(day.key, "close", e.target.value)}
                  className="w-full rounded border border-line bg-paper px-2 py-1 text-sm"
                />
              </div>
            )}
          </div>
        );
      })}
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
