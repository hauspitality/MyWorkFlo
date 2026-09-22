"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBusinessAndSeed } from "@/lib/business-settings/actions";

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern" },
  { value: "America/Chicago", label: "Central" },
  { value: "America/Denver", label: "Mountain" },
  { value: "America/Phoenix", label: "Arizona (no DST)" },
  { value: "America/Los_Angeles", label: "Pacific" },
  { value: "America/Anchorage", label: "Alaska" },
  { value: "Pacific/Honolulu", label: "Hawaii" },
];

export function BusinessForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createBusinessAndSeed({ name, timezone, ownerName, ownerPhone });
      router.push("/onboarding/test");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-ink-soft">Business name</span>
        <input
          required
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Weldon Heating & Air"
          className="h-12 w-full rounded-xl border border-line bg-paper px-4 text-base outline-none focus:border-accent-blue/50 focus:ring-2 focus:ring-accent-blue/15"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-ink-soft">Timezone</span>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="h-12 w-full rounded-xl border border-line bg-paper px-4 text-base outline-none focus:border-accent-blue/50 focus:ring-2 focus:ring-accent-blue/15"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-ink-soft">Your name</span>
        <input
          required
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
          placeholder="Damon Lawrence"
          className="h-12 w-full rounded-xl border border-line bg-paper px-4 text-base outline-none focus:border-accent-blue/50 focus:ring-2 focus:ring-accent-blue/15"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-ink-soft">Your cell phone</span>
        <input
          required
          type="tel"
          inputMode="tel"
          value={ownerPhone}
          onChange={(e) => setOwnerPhone(e.target.value)}
          placeholder="+1 555 555 0100"
          className="h-12 w-full rounded-xl border border-line bg-paper px-4 text-base outline-none focus:border-accent-blue/50 focus:ring-2 focus:ring-accent-blue/15"
        />
        <span className="mt-1 block text-xs text-muted">Where emergency alerts and approval texts go.</span>
      </label>
      {error && <p className="text-sm text-gauge-red">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="flex h-12 w-full items-center justify-center rounded-full bg-accent-blue font-semibold text-white transition-colors hover:bg-accent-blue-deep disabled:opacity-60"
      >
        {saving ? "Setting up..." : "Continue"}
      </button>
    </form>
  );
}
