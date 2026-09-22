/**
 * Carrier-compliance keyword sets, shared by the SMS webhook and anything
 * else that must recognize an opt-out/opt-in. The message must be exactly
 * the keyword (trimmed, case-insensitive, trailing punctuation ignored) —
 * "please stop calling about my AC" is a normal customer message, not an
 * opt-out. Mirrors Twilio's default keyword list.
 */

export const OPT_OUT_WORDS: Set<string> = new Set(["stop", "stopall", "unsubscribe", "cancel", "end", "quit"]);

// Deliberately NOT including "yes" — YES is an approval reply from staff and
// an ordinary answer from customers; only the explicit re-subscribe keywords
// count.
export const OPT_IN_WORDS: Set<string> = new Set(["start", "unstop"]);
