import { describe, expect, it } from "vitest";
import { detectEmergencySignal } from "./emergencySignals";

describe("detectEmergencySignal", () => {
  it("returns null for a routine no-cooling complaint", () => {
    expect(detectEmergencySignal("our ac stopped working today")).toBeNull();
  });

  it("returns null for a routine no-heat complaint", () => {
    expect(detectEmergencySignal("no heat since this morning, its freezing")).toBeNull();
  });

  it("detects a gas smell in English", () => {
    expect(detectEmergencySignal("I smell gas near my furnace")?.category).toBe("GAS_SMELL");
  });

  it("detects a gas smell in Spanish", () => {
    expect(detectEmergencySignal("huele a gas en la cocina")?.category).toBe("GAS_SMELL");
  });

  it("detects the compound CO signal (appliance + symptom) without the words carbon monoxide", () => {
    const match = detectEmergencySignal(
      "my whole family has been dizzy and the furnace has been running all day",
    );
    expect(match?.category).toBe("CARBON_MONOXIDE_CONCERN");
  });

  it("detects sparking in English and Spanish", () => {
    expect(detectEmergencySignal("there are sparks coming from the outlet")?.category).toBe("SPARKING_ELECTRICAL");
    expect(detectEmergencySignal("sale humo del enchufe")?.category).toBe("SPARKING_ELECTRICAL");
  });

  it("detects flooding near electrical in Spanish", () => {
    expect(detectEmergencySignal("se inundo cerca del panel electrico")?.category).toBe(
      "FLOODING_NEAR_ELECTRICAL",
    );
  });

  it("detects a burning smell", () => {
    expect(detectEmergencySignal("smells like something is burning near the unit")?.category).toBe(
      "BURNING_SMELL_ELECTRICAL",
    );
  });

  it("does not require the conversation's detected language to match — runs regardless", () => {
    // A bilingual household mixing languages mid-message should still trip.
    expect(detectEmergencySignal("hola, I think huele a gas in the kitchen")?.category).toBe("GAS_SMELL");
  });
});
