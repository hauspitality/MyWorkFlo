"use client";

import { useState } from "react";
import { EMERGENCY_CATEGORY_INFO } from "@/lib/hvac/emergencySignals";

export function EmergencyKeywordsEditor({
  initial,
  onSave,
  submitLabel = "Save",
}: {
  initial: string[];
  onSave: (keywords: string[]) => Promise<void>;
  submitLabel?: string;
}) {
  const [keywords, setKeywords] = useState<string[]>(initial);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addKeyword() {
    const trimmed = draft.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords((prev) => [...prev, trimmed]);
    }
    setDraft("");
  }

  function removeKeyword(word: string) {
    setKeywords((prev) => prev.filter((k) => k !== word));
  }

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      await onSave(keywords);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm text-muted">
          These always trigger an instant, pre-approved safety reply and notify your team right away — no
          exceptions, no waiting on your control mode setting.
        </p>
        <div className="space-y-2 rounded-md border border-line bg-paper p-3">
          {EMERGENCY_CATEGORY_INFO.map((c) => (
            <div key={c.category} className="text-sm">
              <span className="font-medium text-ink">{c.label}:</span>{" "}
              <span className="text-muted">{c.examples.join(", ")}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm text-muted">
          Add any extra words or phrases specific to your business — misspellings, brand names, local slang for
          a hazard. These trigger the same instant safety response.
        </p>
        <div className="mb-2 flex flex-wrap gap-2">
          {keywords.map((word) => (
            <span
              key={word}
              className="flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1 text-xs text-ink-soft"
            >
              {word}
              <button onClick={() => removeKeyword(word)} className="text-muted hover:text-gauge-red" aria-label={`Remove ${word}`}>
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addKeyword();
              }
            }}
            placeholder="e.g. popping sound"
            className="flex-1 rounded-md border border-line bg-paper px-3 py-1.5 text-sm"
          />
          <button onClick={addKeyword} className="rounded-md border border-line px-3 py-1.5 text-sm text-ink-soft">
            Add
          </button>
        </div>
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
