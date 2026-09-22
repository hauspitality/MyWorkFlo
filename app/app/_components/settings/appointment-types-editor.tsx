"use client";

import { useCallback, useEffect, useState } from "react";
import { HVAC_ISSUE_TYPES } from "@/lib/hvac/taxonomy";
import { Button } from "@/app/_components/ui";
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

const INPUT = "h-10 w-full rounded-xl border border-line bg-paper px-3 text-sm outline-none transition-colors focus:border-accent-blue/50 focus:bg-card";

function snapshot(draft: AppointmentTypeRow, pricingEnabled: boolean): string {
  return JSON.stringify({ draft, pricingEnabled });
}

function RowEditor({
  rowKey,
  row,
  onSave,
  onDelete,
  onDirtyChange,
}: {
  rowKey: string;
  row: AppointmentTypeRow;
  onSave: (input: AppointmentTypeInput) => Promise<{ id: string }>;
  onDelete?: (id: string) => Promise<void>;
  onDirtyChange?: (rowKey: string, dirty: boolean) => void;
}) {
  const [draft, setDraft] = useState<AppointmentTypeRow>(row);
  const [pricingEnabled, setPricingEnabled] = useState(Boolean(row.pricing));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState(row.id);
  const [savedFlash, setSavedFlash] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState(() => snapshot(row, Boolean(row.pricing)));

  const dirty = !deleting && snapshot(draft, pricingEnabled) !== savedSnapshot;
  useEffect(() => {
    onDirtyChange?.(rowKey, dirty);
    return () => onDirtyChange?.(rowKey, false);
  }, [rowKey, dirty, onDirtyChange]);

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
      setSavedSnapshot(snapshot(draft, pricingEnabled));
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!savedId || !onDelete) return;
    if (!window.confirm(`Remove “${draft.name || "this appointment type"}”? The AI will stop offering it.`)) return;
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
    <div className="space-y-3 rounded-2xl border border-line bg-card p-4 shadow-card">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1.5 block font-medium text-ink-soft">Name</span>
          <input value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} className={INPUT} />
        </label>
        <label className="text-sm">
          <span className="mb-1.5 block font-medium text-ink-soft">Duration (minutes)</span>
          <input
            type="number"
            min={15}
            step={15}
            value={draft.duration_minutes}
            onChange={(e) => setDraft((p) => ({ ...p, duration_minutes: Number(e.target.value) }))}
            className={INPUT + " tabular-nums"}
          />
        </label>
      </div>

      <label className="flex items-start gap-2.5 py-1 text-sm text-ink-soft">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0"
          checked={draft.auto_bookable}
          onChange={(e) => setDraft((p) => ({ ...p, auto_bookable: e.target.checked }))}
        />
        Allow Autopilot to book this automatically (only used when the business&rsquo;s control mode is Autopilot)
      </label>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-ink-soft">Which issues is this for?</span>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-xl border border-line bg-paper p-3 sm:grid-cols-3">
          {HVAC_ISSUE_TYPES.filter((issue) => issue.defaultUrgency !== "emergency").map((issue) => (
            <label key={issue.code} className="flex items-start gap-1.5 text-xs text-ink-soft">
              <input
                type="checkbox"
                className="mt-px h-3.5 w-3.5 shrink-0"
                checked={draft.hvac_issue_codes.includes(issue.code)}
                onChange={() => toggleIssueCode(issue.code)}
              />
              {issue.label}
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-line bg-paper p-3.5">
        <label className="flex items-center gap-2 text-sm font-medium text-ink">
          <input type="checkbox" className="h-4 w-4" checked={pricingEnabled} onChange={(e) => setPricingEnabled(e.target.checked)} />
          Give the AI pricing guidance for this
        </label>
        {pricingEnabled && (
          <div className="mt-3 space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs">
                <span className="mb-1 block font-medium text-ink-soft">Low ($)</span>
                <input
                  type="number"
                  value={draft.pricing?.price_range_min ?? ""}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      pricing: { ...(p.pricing ?? { price_range_min: null, price_range_max: null, display_text: "", is_quotable_by_ai: true }), price_range_min: e.target.value ? Number(e.target.value) : null },
                    }))
                  }
                  className="h-10 w-full rounded-xl border border-line bg-card px-3 text-sm tabular-nums outline-none transition-colors focus:border-accent-blue/50"
                />
              </label>
              <label className="text-xs">
                <span className="mb-1 block font-medium text-ink-soft">High ($)</span>
                <input
                  type="number"
                  value={draft.pricing?.price_range_max ?? ""}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      pricing: { ...(p.pricing ?? { price_range_min: null, price_range_max: null, display_text: "", is_quotable_by_ai: true }), price_range_max: e.target.value ? Number(e.target.value) : null },
                    }))
                  }
                  className="h-10 w-full rounded-xl border border-line bg-card px-3 text-sm tabular-nums outline-none transition-colors focus:border-accent-blue/50"
                />
              </label>
            </div>
            <label className="block text-xs">
              <span className="mb-1 block font-medium text-ink-soft">What the AI can say</span>
              <input
                value={draft.pricing?.display_text ?? ""}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    pricing: { ...(p.pricing ?? { price_range_min: null, price_range_max: null, display_text: "", is_quotable_by_ai: true }), display_text: e.target.value },
                  }))
                }
                placeholder="Diagnostic visits run $89-$129, plus any approved repair cost."
                className="h-10 w-full rounded-xl border border-line bg-card px-3 text-sm outline-none transition-colors focus:border-accent-blue/50"
              />
            </label>
            <label className="flex items-start gap-2 text-xs text-ink-soft">
              <input
                type="checkbox"
                className="mt-px h-3.5 w-3.5 shrink-0"
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
        <Button onClick={handleSave} disabled={saving || !draft.name.trim()}>
          {saving ? "Saving…" : "Save"}
        </Button>
        {savedFlash && !dirty && <span className="text-xs font-medium text-gauge-green">Saved ✓</span>}
        {dirty && !savedFlash && <span className="text-xs text-muted">Unsaved changes</span>}
        {savedId && onDelete && (
          <Button variant="danger" onClick={handleDelete} className="ml-auto">
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}

export function AppointmentTypesEditor({
  initial,
  onSave,
  onDelete,
  onDirtyChange,
}: {
  initial: AppointmentTypeRow[];
  onSave: (input: AppointmentTypeInput) => Promise<{ id: string }>;
  onDelete: (id: string) => Promise<void>;
  /** Reports how many rows have unsaved edits — lets wizards block "Continue" until everything is saved. */
  onDirtyChange?: (dirtyCount: number) => void;
}) {
  const [rows, setRows] = useState<AppointmentTypeRow[]>(initial.length ? initial : [BLANK_ROW]);
  const [dirtyKeys, setDirtyKeys] = useState<ReadonlySet<string>>(new Set());

  const handleRowDirty = useCallback((rowKey: string, dirty: boolean) => {
    setDirtyKeys((prev) => {
      if (prev.has(rowKey) === dirty) return prev;
      const next = new Set(prev);
      if (dirty) next.add(rowKey);
      else next.delete(rowKey);
      return next;
    });
  }, []);

  useEffect(() => {
    onDirtyChange?.(dirtyKeys.size);
  }, [dirtyKeys, onDirtyChange]);

  return (
    <div className="space-y-3">
      {rows.map((row, i) => {
        const rowKey = row.id ?? `new-${i}`;
        return (
          <RowEditor key={rowKey} rowKey={rowKey} row={row} onSave={onSave} onDelete={onDelete} onDirtyChange={handleRowDirty} />
        );
      })}
      <Button variant="secondary" onClick={() => setRows((prev) => [...prev, { ...BLANK_ROW }])}>
        + Add appointment type
      </Button>
    </div>
  );
}
