"use client";

import { useState } from "react";
import { Button, Chip } from "@/app/_components/ui";
import { formatPhone, humanizeCode } from "@/lib/format";
import { staffSeatLimit } from "@/lib/billing/limits";
import type { PlanTier, Staff } from "@/lib/supabase/types";

export type StaffManagerRow = Pick<Staff, "id" | "name" | "phone_number" | "role" | "is_active">;

const INPUT_CLASS =
  "h-10 w-full rounded-xl border border-line bg-paper px-3.5 text-sm outline-none transition-colors placeholder:text-faint focus:border-accent-blue/50 focus:bg-card";

/**
 * Real staff management (replaces the old "coming soon" list). Rows render
 * straight from props — the server actions revalidate /dashboard/settings,
 * so the list refreshes itself after every change.
 */
export function StaffManager({
  staff,
  planTier,
  onAdd,
  onSetActive,
}: {
  staff: StaffManagerRow[];
  planTier: PlanTier | null;
  onAdd: (input: { name: string; phone: string; role: "dispatcher" | "tech" }) => Promise<void>;
  onSetActive: (staffId: string, isActive: boolean) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"dispatcher" | "tech">("tech");
  const [adding, setAdding] = useState(false);
  const [addedFlash, setAddedFlash] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const seatLimit = staffSeatLimit(planTier);
  const activeCount = staff.filter((s) => s.is_active).length;
  const atLimit = activeCount >= seatLimit;

  async function handleAdd() {
    setAdding(true);
    setError(null);
    try {
      await onAdd({ name, phone, role });
      setName("");
      setPhone("");
      setAddedFlash(true);
      setTimeout(() => setAddedFlash(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add staff member");
    } finally {
      setAdding(false);
    }
  }

  async function handleToggle(row: StaffManagerRow) {
    setTogglingId(row.id);
    setError(null);
    try {
      await onSetActive(row.id, !row.is_active);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update staff member");
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Active staff get approval requests and emergency alerts by text and push.</p>

      <div className="space-y-2">
        {staff.map((s) => (
          <div
            key={s.id}
            className={
              "flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm " +
              (s.is_active ? "" : "opacity-60")
            }
          >
            <span className="min-w-0 truncate font-medium text-ink">{s.name}</span>
            <span className="shrink-0 tabular-nums text-muted">{formatPhone(s.phone_number)}</span>
            <span className="flex shrink-0 items-center gap-1.5">
              <Chip>{humanizeCode(s.role)}</Chip>
              {!s.is_active && <Chip tone="amber">Inactive</Chip>}
              {s.role !== "owner" && (
                <button
                  onClick={() => handleToggle(s)}
                  disabled={togglingId === s.id || (!s.is_active && atLimit)}
                  className={
                    "rounded-full px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60 " +
                    (s.is_active
                      ? "text-muted hover:bg-gauge-red-soft hover:text-gauge-red"
                      : "text-accent-blue hover:bg-accent-blue-soft")
                  }
                >
                  {togglingId === s.id ? "Updating…" : s.is_active ? "Deactivate" : "Reactivate"}
                </button>
              )}
            </span>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted">
        Using {activeCount} of {seatLimit} staff seats on your plan.
      </p>

      {atLimit ? (
        <p className="rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink-soft">
          Your plan includes {seatLimit} staff members. To add more, upgrade your plan under Billing &amp; plan.
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-medium text-ink">Add a staff member</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            aria-label="Staff member name"
            className={INPUT_CLASS}
          />
          <div className="flex gap-2">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              aria-label="Staff member phone number"
              inputMode="tel"
              className={INPUT_CLASS}
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "dispatcher" | "tech")}
              aria-label="Staff member role"
              className="h-10 shrink-0 rounded-xl border border-line bg-paper px-3 text-sm text-ink outline-none transition-colors focus:border-accent-blue/50 focus:bg-card"
            >
              <option value="tech">Tech</option>
              <option value="dispatcher">Dispatcher</option>
            </select>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <Button variant="secondary" onClick={handleAdd} disabled={adding || !name.trim() || !phone.trim()}>
              {adding ? "Adding…" : "Add staff member"}
            </Button>
            {addedFlash && <span className="text-xs font-medium text-gauge-green">Added ✓</span>}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-gauge-red">{error}</p>}
    </div>
  );
}
