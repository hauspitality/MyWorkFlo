/**
 * Post-generation scan on a drafted reply, run BEFORE anything sends to a
 * customer. This is the real backstop for the "never invent a price/time,
 * never give repair instructions" rules — prompt wording alone is not
 * treated as sufficient on its own. Pure function, unit-test this directly.
 *
 * Deliberately coarse and over-triggering, same philosophy as the
 * emergency detector: a false positive costs a human a quick review tap,
 * a missed violation could mean a customer is quoted a price nobody
 * approved. "Our tech will check the breaker" and "go ahead and check
 * your breaker" both trip the repair-language check — that's intentional,
 * not a bug to tighten later without discussing the tradeoff.
 */

export interface GuardrailViolation {
  type: "unsourced_price" | "unsourced_time" | "repair_language";
  detail: string;
}

const DOLLAR_PATTERN = /\$\s?\d{1,3}(,\d{3})*(\.\d{2})?/g;

const TIME_PATTERNS = [
  /\b\d{1,2}(:\d{2})?\s?(am|pm)\b/i,
  /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  /\b(today|tomorrow|tonight)\b/i,
  /\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/,
];

const REPAIR_VERBS = [
  "check",
  "reset",
  "replace",
  "flip",
  "unplug",
  "restart",
  "inspect",
  "open",
  "close",
  "turn off",
  "turn on",
  "shut off",
  "switch",
];

const EQUIPMENT_NOUNS = [
  "breaker",
  "filter",
  "thermostat",
  "valve",
  "switch",
  "panel",
  "unit",
  "vent",
  "coil",
  "fuse",
  "pilot light",
  "gas line",
];

function containsRepairLanguage(text: string): string | null {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);

  for (const verb of REPAIR_VERBS) {
    const verbWords = verb.split(" ");
    for (let i = 0; i <= words.length - verbWords.length; i++) {
      if (words.slice(i, i + verbWords.length).join(" ") !== verb) continue;

      // Look within a 5-word window after the verb for an equipment noun.
      const windowStart = i + verbWords.length;
      const window = words.slice(windowStart, windowStart + 6).join(" ");
      const noun = EQUIPMENT_NOUNS.find((n) => window.includes(n));
      if (noun) return `"${verb} ... ${noun}"`;
    }
  }

  return null;
}

export function runOutputGuardrails(
  replyText: string,
  toolCallsThisTurn: string[],
): GuardrailViolation[] {
  const violations: GuardrailViolation[] = [];

  const dollarMatches = replyText.match(DOLLAR_PATTERN);
  if (dollarMatches && !toolCallsThisTurn.includes("get_pricing_guidance")) {
    violations.push({
      type: "unsourced_price",
      detail: `Reply contains ${dollarMatches.join(", ")} but get_pricing_guidance was never called this turn.`,
    });
  }

  const hasTimeClaim = TIME_PATTERNS.some((pattern) => pattern.test(replyText));
  if (hasTimeClaim && !toolCallsThisTurn.includes("check_availability")) {
    violations.push({
      type: "unsourced_time",
      detail: "Reply appears to state a date/time but check_availability was never called this turn.",
    });
  }

  const repairMatch = containsRepairLanguage(replyText);
  if (repairMatch) {
    violations.push({
      type: "repair_language",
      detail: `Reply contains possible repair/equipment instruction: ${repairMatch}.`,
    });
  }

  return violations;
}
