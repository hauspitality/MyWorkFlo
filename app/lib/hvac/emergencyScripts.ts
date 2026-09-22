import type { EmergencyCategory } from "./emergencySignals";
import type { CustomerLang } from "@/lib/messaging/customer-strings";

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
 *
 * SPANISH (Phase 7): the Spanish scripts are direct translations of the
 * English and preserve the exact safety semantics — every instruction is
 * person-directed (salir, alejarse, llamar al 911), never
 * equipment-directed. The bright-line policy above applies to BOTH
 * languages: any revision must change both in lockstep and keep the meaning
 * identical. Pending native-speaker review before they're considered final.
 */

const SCRIPTS_EN: Record<EmergencyCategory, (businessName: string) => string> = {
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

  // Matched one of this business's own custom trigger words (see
  // service_settings.emergency_keywords) — the hazard type isn't known, so
  // this stays deliberately generic rather than guessing.
  CUSTOM_TRIGGER: (businessName) =>
    `This sounds urgent, so we're treating it as a safety priority. If you're in any danger, please get to safety and call 911. We've alerted ${businessName}'s team right now so a person can follow up immediately.`,
};

const SCRIPTS_ES: Record<EmergencyCategory, (businessName: string) => string> = {
  GAS_SMELL: (businessName) =>
    `Eso suena a un posible olor a gas — es una emergencia de seguridad. Por favor sal de la casa ahora mismo y, ya estando afuera y a salvo, llama al 911 o a la línea de emergencias de tu compañía de gas. No uses los interruptores de luz ni tu teléfono mientras estés adentro. Ya avisamos al equipo de ${businessName} para que te contacten en cuanto sea seguro. Esto quedó marcado como urgente.`,

  CARBON_MONOXIDE_CONCERN: (businessName) =>
    `Esto podría ser un problema de monóxido de carbono — es una emergencia de seguridad. Por favor saca a todos de la casa al aire libre ahora mismo y llama al 911. Cuando estén a salvo, ellos te dirán qué hacer. Ya avisamos al equipo de ${businessName} de inmediato. Esto quedó marcado como urgente.`,

  SPARKING_ELECTRICAL: (businessName) =>
    `Chispas o humo saliendo de un equipo eléctrico es una emergencia de seguridad. Por favor aléjate del equipo y, si puedes hacerlo sin peligro, sal del área. Si ves llamas, llama al 911. Ya avisamos al equipo de ${businessName}. Esto quedó marcado como urgente.`,

  FLOODING_NEAR_ELECTRICAL: (businessName) =>
    `Agua cerca de un equipo eléctrico es una emergencia de seguridad. Por favor mantente lejos del área y no toques nada eléctrico que esté cerca. Si parece peligroso, llama al 911. Ya avisamos al equipo de ${businessName}. Esto quedó marcado como urgente.`,

  BURNING_SMELL_ELECTRICAL: (businessName) =>
    `Un olor a quemado cerca de un equipo eléctrico o del aire/calefacción es una emergencia de seguridad. Por favor aléjate del área. Si ves humo o llamas, sal de la casa y llama al 911. Ya avisamos al equipo de ${businessName}. Esto quedó marcado como urgente.`,

  CUSTOM_TRIGGER: (businessName) =>
    `Esto suena urgente, así que lo estamos tratando como una prioridad de seguridad. Si estás en peligro, por favor ponte a salvo y llama al 911. Ya avisamos al equipo de ${businessName} para que una persona te contacte de inmediato.`,
};

/**
 * Exported for the read-only settings preview
 * (app/_components/settings/safety-scripts-preview.tsx), which iterates the
 * categories and renders the English scripts. The English record is the
 * canonical key set; SCRIPTS_ES mirrors it exactly.
 */
export const SCRIPTS = SCRIPTS_EN;

export function getEmergencyScript(category: EmergencyCategory, businessName: string, lang: CustomerLang = "en"): string {
  const scripts = lang === "es" ? SCRIPTS_ES : SCRIPTS_EN;
  return scripts[category](businessName);
}

/**
 * Sent for any further inbound message after a conversation has already
 * been marked escalated_emergency. The AI must not keep "trying to help" —
 * that's the gimmicky-AI failure mode the brand explicitly avoids. A human
 * has already been notified; repeating that is the only job left.
 */
export function getEmergencyAcknowledgment(lang: CustomerLang = "en"): string {
  if (lang === "es") {
    return "Esto ya quedó marcado como urgente y nuestro equipo ya fue avisado. Si esto pone en riesgo tu vida, por favor llama al 911.";
  }
  return "This has been flagged urgent and our team has already been notified. If this becomes life-threatening, please call 911.";
}
