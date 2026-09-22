/**
 * Layer 1 emergency detection: deterministic, no LLM call. Runs on every
 * inbound message, in both English and Spanish, regardless of the
 * conversation's detected language — a bilingual household may text in
 * either or mix both, so language-gating this check is itself a risk.
 *
 * This is intentionally biased toward over-triggering. A false positive
 * costs a human thirty seconds glancing at a text thread; a missed signal
 * could cost a life. Do not "tighten" this list to reduce false positives
 * without discussing the tradeoff explicitly — that's a safety regression,
 * not a quality improvement.
 *
 * Layer 2 (the model's own judgment via the flag_emergency tool, for
 * phrasing this fixed list can't anticipate) lives in lib/ai/tools.ts.
 */

export type EmergencyCategory =
  | "GAS_SMELL"
  | "CARBON_MONOXIDE_CONCERN"
  | "SPARKING_ELECTRICAL"
  | "FLOODING_NEAR_ELECTRICAL"
  | "BURNING_SMELL_ELECTRICAL"
  | "CUSTOM_TRIGGER";

export interface EmergencyMatch {
  category: EmergencyCategory;
  matchedPhrase: string;
}

/**
 * For onboarding/settings' "emergency keywords" screen: shown to the
 * business owner for transparency ("builds trust", per the build plan),
 * not editable — the fixed categories/wording are platform-owned. Kept
 * intentionally illustrative rather than the literal full phrase lists
 * below, which are free to grow without needing a UI copy update.
 */
export const EMERGENCY_CATEGORY_INFO: Array<{ category: EmergencyCategory; label: string; examples: string[] }> = [
  { category: "GAS_SMELL", label: "Gas smell", examples: ["\"I smell gas\"", "\"huele a gas\""] },
  {
    category: "CARBON_MONOXIDE_CONCERN",
    label: "Carbon monoxide concern",
    examples: ["\"CO alarm going off\"", "furnace running + someone feeling dizzy/nauseous"],
  },
  { category: "SPARKING_ELECTRICAL", label: "Sparking / smoking electrical", examples: ["\"sparks from the outlet\"", "\"sale humo\""] },
  { category: "FLOODING_NEAR_ELECTRICAL", label: "Flooding near electrical", examples: ["\"water near the breaker panel\""] },
  { category: "BURNING_SMELL_ELECTRICAL", label: "Burning smell", examples: ["\"something smells like it's burning\"", "\"huele a quemado\""] },
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents so "monóxido" ~ "monoxido"
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Deliberately generous with misspellings/variants — real customers texting
// in a hurry or in a panic do not spell carefully.
const GAS_SMELL_PHRASES = [
  "smell gas",
  "smells like gas",
  "smell of gas",
  "gaz smell",
  "gas smell",
  "gas leak",
  "rotten egg",
  "rotten eggs",
  "sulfur smell",
  "propane smell",
  "huele a gas",
  "huele a azufre",
  "olor a gas",
  "hay una fuga de gas",
];

const CO_DEVICE_PHRASES = [
  "co alarm",
  "co detector",
  "carbon monoxide detector",
  "carbon monoxide alarm",
  "detector de monoxido",
  "alarma de monoxido",
];

// Compound signal: a heating-appliance word co-occurring with a symptom
// word. People describing CO poisoning often never say "carbon monoxide"
// at all — this catches that case; a bare keyword list wouldn't.
const CO_APPLIANCE_WORDS = ["furnace", "heater", "boiler", "calefaccion", "calentador"];
const CO_SYMPTOM_WORDS = [
  "dizzy",
  "dizziness",
  "headache",
  "nauseous",
  "nausea",
  "lightheaded",
  "passed out",
  "mareado",
  "mareada",
  "dolor de cabeza",
  "me siento mal",
  "nauseas",
];

const SPARKING_PHRASES = [
  "spark",
  "sparks",
  "sparking",
  "smoke coming from",
  "outlet smoking",
  "outlet is smoking",
  "chispas",
  "sale humo",
  "esta humeando",
];

const BURNING_ELECTRICAL_PHRASES = [
  "burning smell",
  "smells like burning",
  "something is burning",
  "electrical smell",
  "huele a quemado",
  "olor a quemado",
];

const FLOODING_ELECTRICAL_PHRASES = [
  "flooded near the breaker",
  "flooding near the panel",
  "water near the breaker",
  "water near the panel",
  "flooded electrical",
  "se inundo cerca del panel",
  "agua cerca del breaker",
];

function includesPhrase(normalized: string, phrases: string[]): string | null {
  for (const phrase of phrases) {
    if (normalized.includes(normalize(phrase))) return phrase;
  }
  return null;
}

/**
 * Returns the highest-priority emergency match found in the text, or null.
 * Checks every category rather than short-circuiting on the first hit type,
 * but returns as soon as any match is found — the caller doesn't need to
 * qualify further once one true emergency signal is present.
 *
 * `customKeywords` is this business's own per-tenant supplement (seeded
 * empty, editable in onboarding/settings — see service_settings.
 * emergency_keywords) — checked last, after the platform's own fixed
 * categories, since those are more specific when they also match. A hit
 * here has no known hazard type, so it maps to the generic CUSTOM_TRIGGER
 * script rather than guessing a specific one.
 */
export function detectEmergencySignal(rawText: string, customKeywords: string[] = []): EmergencyMatch | null {
  const text = normalize(rawText);

  const gasMatch = includesPhrase(text, GAS_SMELL_PHRASES);
  if (gasMatch) return { category: "GAS_SMELL", matchedPhrase: gasMatch };

  const coDeviceMatch = includesPhrase(text, CO_DEVICE_PHRASES);
  if (coDeviceMatch) return { category: "CARBON_MONOXIDE_CONCERN", matchedPhrase: coDeviceMatch };

  const hasApplianceWord = CO_APPLIANCE_WORDS.some((w) => text.includes(w));
  const hasSymptomWord = CO_SYMPTOM_WORDS.some((w) => text.includes(normalize(w)));
  if (hasApplianceWord && hasSymptomWord) {
    return { category: "CARBON_MONOXIDE_CONCERN", matchedPhrase: "appliance+symptom co-occurrence" };
  }

  const sparkMatch = includesPhrase(text, SPARKING_PHRASES);
  if (sparkMatch) return { category: "SPARKING_ELECTRICAL", matchedPhrase: sparkMatch };

  const floodMatch = includesPhrase(text, FLOODING_ELECTRICAL_PHRASES);
  if (floodMatch) return { category: "FLOODING_NEAR_ELECTRICAL", matchedPhrase: floodMatch };

  const burnMatch = includesPhrase(text, BURNING_ELECTRICAL_PHRASES);
  if (burnMatch) return { category: "BURNING_SMELL_ELECTRICAL", matchedPhrase: burnMatch };

  const customMatch = includesPhrase(
    text,
    customKeywords.filter((k) => k.trim().length > 0),
  );
  if (customMatch) return { category: "CUSTOM_TRIGGER", matchedPhrase: customMatch };

  return null;
}
