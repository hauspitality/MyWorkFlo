import { getEmergencyAcknowledgment } from "@/lib/hvac/emergencyScripts";

/**
 * Every canned (non-model-generated) string a CUSTOMER can receive, in
 * English and Spanish, in one place. The AI's own replies are localized by
 * the model itself; these are the fixed fallbacks and openers that go out
 * when no model turn is involved, so they must be pre-translated here.
 *
 * TRANSLATION STATUS (Phase 7): the Spanish strings are faithful,
 * plain-language translations with the same meaning as the English, written
 * in-house. They still need a native-speaker review before we call them
 * final — keep meaning identical when revising, especially anything that
 * touches safety.
 *
 * The locked emergency safety scripts themselves live in
 * lib/hvac/emergencyScripts.ts (with the bright-line policy that governs
 * them); this module re-exposes only the post-escalation acknowledgment.
 */

export type CustomerLang = "en" | "es";

/**
 * Collapse a free-form language value (leads.language, the model's
 * decision.language, "es-MX", "Spanish"...) onto the two languages we can
 * send in. Anything not clearly Spanish falls back to English.
 */
export function toCustomerLang(value: string | null | undefined): CustomerLang {
  const v = (value ?? "").trim().toLowerCase();
  if (v.startsWith("es") || v.startsWith("spanish")) return "es";
  return "en";
}

/**
 * First text after a missed call. Always ends with opt-out language — this
 * is the first message of a business-initiated thread, so it must carry
 * the STOP notice (TCPA/carrier compliance).
 */
export function missedCallOpener(businessName: string, lang: CustomerLang): string {
  if (lang === "es") {
    return `Perdón que no pudimos contestar tu llamada — somos ${businessName}. Cuéntanos por mensaje qué está pasando y te ayudamos. Responde STOP para no recibir más mensajes.`;
  }
  return `Sorry we missed your call — this is ${businessName}. Text back what's going on and we'll get you taken care of. Reply STOP to opt out.`;
}

/**
 * Sent for any inbound message after a conversation is already
 * escalated_emergency. Delegates to the locked script file so the safety
 * wording has exactly one home.
 */
export function emergencyAcknowledgment(lang: CustomerLang): string {
  return getEmergencyAcknowledgment(lang);
}

/** The AI couldn't reach a decision (iteration cap) — hand off to a person. */
export function needsHumanFallback(lang: CustomerLang): string {
  if (lang === "es") {
    return "Mejor le paso esto a una persona de nuestro equipo — alguien te escribirá en un momento.";
  }
  return "Let me get a real person on this for you — someone from our team will text you back shortly.";
}

/** A staff approval expired unanswered — don't leave the customer hanging. */
export function approvalExpiryFallback(lang: CustomerLang): string {
  if (lang === "es") {
    return "Gracias por esperar — alguien de nuestro equipo te escribirá en un momento.";
  }
  return "Thanks for waiting — someone from our team will text you back shortly.";
}

/** Sent when staff approves a held booking. `whenText` is already formatted for the customer (e.g. "Tuesday at 10am"). */
export function bookingConfirmation(params: { whenText: string; lang: CustomerLang }): string {
  if (params.lang === "es") {
    return `Listo, tu cita quedó para ${params.whenText}. Nos vemos entonces — si algo cambia, escríbenos aquí.`;
  }
  return `You're all set for ${params.whenText}. We'll see you then — if anything changes, just text us here.`;
}

/** An autopilot booking failed to save — hold the customer while it falls back to staff approval. Never claims the booking happened. */
export function bookingHoldFallback(lang: CustomerLang): string {
  if (lang === "es") {
    return "Déjame confirmar esa hora con el equipo y te aviso enseguida.";
  }
  return "Let me double-check that time with the team and confirm right back.";
}

/** One-time confirmation after START/UNSTOP re-subscribes a phone. Must include the STOP notice. */
export function optInConfirmation(lang: CustomerLang): string {
  if (lang === "es") {
    return "Ya puedes recibir nuestros mensajes de nuevo. Escríbenos cuando quieras — responde STOP para no recibir más mensajes.";
  }
  return "You're opted back in. Text us anytime — reply STOP to opt out.";
}

/** One-time reply to HELP/INFO keywords. Must name the business and include the STOP notice. */
export function helpText(businessName: string, lang: CustomerLang): string {
  if (lang === "es") {
    return `Somos ${businessName}. Escríbenos qué está pasando y te respondemos enseguida para ayudarte. Responde STOP para no recibir más mensajes.`;
  }
  return `This is ${businessName}. Text us what's going on and we'll text you right back to get it taken care of. Reply STOP to opt out.`;
}
