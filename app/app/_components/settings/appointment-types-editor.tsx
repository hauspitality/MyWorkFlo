"use client";

import { useState } from "react";
import { HVAC_ISSUE_TYPES } from "@/lib/hvac/taxonomy";
import type { AppointmentTypeInput } from "@/lib/business-settings/actions";

export interface AppointmentTypeRow {
  id?: string;
  name: string;
  duration_minutes: number;
  auto_bookable: boolean;
  hvac_issue_codes: string[];
  pricing: { price_range_min: number | null; price_range_max: number | null; display_text: string; is_quotable_by_ai: boolean } | null;
}

const BLANK_ROW: AppointmentTypeRow = {
  name: "",
  duration_minutes: 60,
  auto_bookable: false,
  hvac_issue_codes: [],
  pricing: null,
};

function RowEditor({
  row,
  onSave,
  onDelete,
}: {
  row: AppointmentTypeRow;
  onSave: (input: AppointmentTypeInput) => Promise<{ id: string }>;
  onDelete?: (id: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState<AppointmentTypeRow>(row);
  const [pricingEnabled, setPricingEnabled] = useState(Boolean(row.pricing));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState(row.id);

  function toggleIssueCode(code: string) {
    setDraft((prev) => ({
      ...prev,
      hvac_issue_codes: prev.hvac_issue_codes.includes(code)
        ? prev.hvac_issue_codes.filter((c) => c !== code)
        : [...prev.hvac_issue_codes, code],
    }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const { id } = await onSave({
        id: savedId,
        name: draft.name,
        duration_minutes: draft.duration_minutes,
        auto_bookable: draft.auto_bookable,
        hvac_issue_codes: draft.hvac_issue_codes,
        pricing: pricingEnabled
          ? {
              price_range_min: draft.pricing?.price_range_min ?? null,
              price_range_max: draft.pricing?.price_range_max ?? null,
              display_text: draft.pricing?.display_text ?? "Our technician will quote on-site.",
              is_quotable_by_ai: draft.pricing?.is_quotable_by_ai ?? false,
            }
          : null,
      });
      setSavedId(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!savedId || !onDelete) return;
    setDeleting(true);
    try {
      await onDelete(savedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove");
      setDeleting(false);
    }
  }

  if (deleting) return null;

  return (
    <div className="space-y-3 rounded-lg border border-line bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-muted">Name</span>
          <input
            value={draft.name}
            onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
            className="w-full rounded-md border border-line bg-paper px-2 py-1.5"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">Duration (minutes)</span>
          <input
            type="number"
            min={15}
            step={15}
            value={draft.duration_minutes}
            onChange={(e) => setDraft((p) => ({ ...p, duration_minutes: Number(e.target.value) }))}
            className="w-full rounded-md border border-line bg-paper px-2 py-1.5"
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink-soft">
        <input
          type="checkbox"
          checked={draft.auto_bookable}
          onChange={(e) => setDraft((p) => ({ ...p, auto_bookable: e.target.checked }))}
        />
        Allow Autopilot to book this automatically (only used when the business's control mode is Autopilot)
      </label>

      <div>
        <span className="mb-1 block text-sm text-muted">Which issues is this for?</span>
        <div className="grid max-h-40 grid-cols-2 gap-x-3 gap-y-1 overflow-y-auto rounded-md border border-line bg-paper p-2 sm:grid-cols-3">
          {HVAC_ISSUE_TYPES.filter((issue) => issue.defaultUrgency !== "emergency").map((issue) => (
            <label key={issue.code} className="flex items-center gap-1.5 text-xs text-ink-soft">
              <input
                type="checkbox"
                checked={draft.hvac_issue_codes.includes(issue.code)}
                onChange={() => toggleIssueCode(issue.code)}
              />
              {issue.label}
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-line bg-paper p-3">
        <label className="flex items-center gap-2 text-sm font-medium text-ink">
          <input type="checkbox" checked={pricingEnabled} onChange={(e) => setPricingEnabled(e.target.checked)} />
          Give the AI pricing guidance for this
        </label>
        {pricingEnabled && (
          <div className="mt-2 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs">
                <span className="mb-1 block text-muted">Low ($)</span>
                <input
                  type="number"
                  value={draft.pricing?.price_range_min ?? ""}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      pricing: { ...(p.pricing ?? { price_range_min: null, price_range_max: null, display_text: "", is_quotable_by_ai: true }), price_range_min: e.target.value ? Number(e.target.value) : null },
                    }))
                  }
                  className="w-full rounded border border-line bg-card px-2 py-1"
                />
              </label>
              <label className="text-xs">
                <span className="mb-1 block text-muted">High ($)</span>
                <input
                  type="number"
                  value={draft.pricing?.price_range_max ?? ""}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      pricing: { ...(p.pricing ?? { price_range_min: null, price_range_max: null, display_text: "", is_quotable_by_ai: true }), price_range_max: e.target.value ? Number(e.target.value) : null },
                    }))
                  }
                  className="w-full rounded border border-line bg-card px-2 py-1"
                />
              </label>
            </div>
            <label className="block text-xs">
              <span className="mb-1 block text-muted">What the AI can say</span>
              <input
                value={draft.pricing?.display_text ?? ""}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    pricing: { ...(p.pricing ?? { price_range_min: null, price_range_max: null, display_text: "", is_quotable_by_ai: true }), display_text: e.target.value },
                  }))
                }
                placeholder="Diagnostic visits run $89-$129, plus any approved repair cost."
                className="w-full rounded border border-line bg-card px-2 py-1"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-ink-soft">
              <input
                type="checkbox"
                checked={draft.pricing?.is_quotable_by_ai ?? false}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    pricing: { ...(p.pricing ?? { price_range_min: null, price_range_max: null, display_text: "", is_quotable_by_ai: false }), is_quotable_by_ai: e.target.checked },
                  }))
                }
              />
              Let the AI actually quote this range (otherwise it just says a technician will quote on-site)
            </label>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-gauge-red">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !draft.name.trim()}
          className="rounded-md bg-accent-blue px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        {savedId && onDelete && (
          <button onClick={handleDelete} className="text-sm text-gauge-red">
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

export function AppointmentTypesEditor({
  initial,
  onSave,
  onDelete,
}: {
  initial: AppointmentTypeRow[];
  onSave: (input: AppointmentTypeInput) => Promise<{ id: string }>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [rows, setRows] = useState<AppointmentTypeRow[]>(initial.length ? initial : [BLANK_ROW]);

  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <RowEditor key={row.id ?? `new-${i}`} row={row} onSave={onSave} onDelete={onDelete} />
      ))}
      <button
        onClick={() => setRows((prev) => [...prev, { ...BLANK_ROW }])}
        className="rounded-full border border-line px-3 py-1.5 text-sm text-ink-soft hover:border-accent-blue hover:text-accent-blue"
      >
        + Add appointment type
      </button>
    </div>
  );
}
