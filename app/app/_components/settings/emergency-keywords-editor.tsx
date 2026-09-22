"use client";

import { useState } from "react";
import { Button } from "@/app/_components/ui";
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
  const [savedFlash, setSavedFlash] = useState(false);
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
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
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
        <div className="space-y-2 rounded-xl border border-line bg-paper p-3.5">
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
        {keywords.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {keywords.map((word) => (
              <span
                key={word}
                className="flex items-center gap-0.5 rounded-full border border-line bg-card py-1 pl-3 pr-1 text-xs text-ink-soft"
              >
                {word}
                <button
                  onClick={() => removeKeyword(word)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-sm text-muted transition-colors hover:bg-gauge-red-soft hover:text-gauge-red"
                  aria-label={`Remove ${word}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
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
            aria-label="New emergency keyword"
            className="h-10 flex-1 rounded-xl border border-line bg-paper px-3.5 text-sm outline-none transition-colors placeholder:text-faint focus:border-accent-blue/50 focus:bg-card"
          />
          <Button variant="secondary" onClick={addKeyword}>
            Add
          </Button>
        </div>
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
