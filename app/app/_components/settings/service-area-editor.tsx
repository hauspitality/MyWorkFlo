"use client";

import { useState } from "react";
import { Button } from "@/app/_components/ui";
import type { ServiceArea } from "@/lib/supabase/types";

export function ServiceAreaEditor({
  initial,
  onSave,
  submitLabel = "Save",
}: {
  initial: ServiceArea;
  onSave: (area: ServiceArea) => Promise<void>;
  submitLabel?: string;
}) {
  const [zipsText, setZipsText] = useState((initial.zips ?? []).join(", "));
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const zips = zipsText
      .split(/[,\s]+/)
      .map((z) => z.trim())
      .filter((z) => z.length > 0);

    setSaving(true);
    setError(null);
    try {
      await onSave({ type: "zip_list", zips });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save service area");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-ink-soft">Zip codes you serve (comma or space separated)</span>
        <textarea
          value={zipsText}
          onChange={(e) => setZipsText(e.target.value)}
          rows={3}
          placeholder="10001, 10002, 10003"
          className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm tabular-nums outline-none transition-colors placeholder:text-faint focus:border-accent-blue/50 focus:bg-card"
        />
      </label>
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
