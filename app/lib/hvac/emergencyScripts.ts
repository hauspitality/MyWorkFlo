import type { EmergencyCategory } from "./emergencySignals";

/**
 * Fixed, platform-authored safety response templates. Never model-generated,
 * never business-editable — see the bright-line policy below.
 *
 * BRIGHT-LINE POLICY: if the instruction is about the PERSON (leave, don't
 * touch, call 911, get outside), it's allowed and pre-scripted here. If the
 * instruction is about the EQUIPMENT (check, reset, flip, open, shut off,
 * inspect), it is never allowed, no matter how trivial it seems — including
 * "just shut off the gas valve." That's equipment-directed and possibly
 * dangerous if the underlying fault is something else. The only exception a
 * future engineer might be tempted to add ("just tell them to flip the
 * breaker back") is exactly the kind of change this policy exists to block.
 *
 * These strings are parameterized only with the business's name — nothing
 * else is templated in, and the wording itself is not configurable.
 */

const SCRIPTS: Record<EmergencyCategory, (businessName: string) => string> = {
  GAS_SMELL: (businessName) =>
    `That sounds like a possible gas smell — that's a safety emergency. Please leave the house now and call 911 or your gas company's emergency line once you're safely outside. Don't use light switches or your phone while inside. We've alerted ${businessName}'s team right now so they can follow up as soon as it's safe. This has been marked urgent.`,

  CARBON_MONOXIDE_CONCERN: (businessName) =>
    `This could be a carbon monoxide concern — that's a safety emergency. Please get everyone outside into fresh air right now and call 911. Once you're safe, they can advise on next steps. We've alerted ${businessName}'s team immediately. This has been marked urgent.`,

  SPARKING_ELECTRICAL: (businessName) =>
    `Sparking or smoke from electrical equipment is a safety emergency. Please move away from it and, if you can safely do so, leave the area. If you see flames, call 911. We've alerted ${businessName}'s team right now. This has been marked urgent.`,

  FLOODING_NEAR_ELECTRICAL: (businessName) =>
    `Water near electrical equipment is a safety emergency. Please stay away from the area and don't touch anything electrical nearby. If it seems dangerous, call 911. We've alerted ${businessName}'s team right now. This has been marked urgent.`,

  BURNING_SMELL_ELECTRICAL: (businessName) =>
    `A burning smell near electrical or HVAC equipment is a safety emergency. Please move away from the area. If you see smoke or flames, leave the house and call 911. We've alerted ${businessName}'s team right now. This has been marked urgent.`,
};

export function getEmergencyScript(category: EmergencyCategory, businessName: string): string {
  return SCRIPTS[category](businessName);
}

/**
 * Sent for any further inbound message after a conversation has already
 * been marked escalated_emergency. The AI must not keep "trying to help" —
 * that's the gimmicky-AI failure mode the brand explicitly avoids. A human
 * has already been notified; repeating that is the only job left.
 */
export function getEmergencyAcknowledgment(): string {
  return "This has been flagged urgent and our team has already been notified. If this becomes life-threatening, please call 911.";
}
