/** Shared display formatting — the UI never shows raw codes, enums, or E.164. */

export function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** "Sep 21, 10:53 PM" — for logs and records. */
export function formatCompact(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/** "10:53 PM" — when the date is already established by context. */
export function formatTimeOfDay(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** "Today" / "Yesterday" / "Sep 20" for list group headers. */
export function formatDayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startOf(today) - startOf(date)) / 86_400_000);
  if (dayDiff === 0) return "Today";
  if (dayDiff === 1) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** E.164 or loose US numbers → "(555) 555-0100"; anything else passes through. */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (ten.length !== 10) return raw;
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
}

/** "NO_COOLING" → "No cooling". */
export function humanizeCode(code: string | null | undefined, fallback = ""): string {
  if (!code) return fallback;
  const words = code.toLowerCase().replaceAll("_", " ").replaceAll("-", " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
