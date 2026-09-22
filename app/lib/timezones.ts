export const US_TIMEZONES = [
  { value: "America/New_York", label: "Eastern", longLabel: "Eastern time" },
  { value: "America/Chicago", label: "Central", longLabel: "Central time" },
  { value: "America/Denver", label: "Mountain", longLabel: "Mountain time" },
  { value: "America/Phoenix", label: "Arizona (no DST)", longLabel: "Arizona time" },
  { value: "America/Los_Angeles", label: "Pacific", longLabel: "Pacific time" },
  { value: "America/Anchorage", label: "Alaska", longLabel: "Alaska time" },
  { value: "Pacific/Honolulu", label: "Hawaii", longLabel: "Hawaii time" },
] as const;

/** "America/New_York" → "Eastern time"; unknown zones pass through unchanged. */
export function timezoneLabel(value: string | null | undefined): string {
  if (!value) return "";
  return US_TIMEZONES.find((tz) => tz.value === value)?.longLabel ?? value;
}
