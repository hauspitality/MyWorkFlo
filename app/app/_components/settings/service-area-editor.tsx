"use client";

import { useState } from "react";
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save service area");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm">
        <span className="mb-1 block text-muted">Zip codes you serve (comma or space separated)</span>
        <textarea
          value={zipsText}
          onChange={(e) => setZipsText(e.target.value)}
          rows={3}
          placeholder="10001, 10002, 10003"
          className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm"
        />
      </label>
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
