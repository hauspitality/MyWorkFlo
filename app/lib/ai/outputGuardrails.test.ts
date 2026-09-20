import { describe, expect, it } from "vitest";
import { runOutputGuardrails } from "./outputGuardrails";

describe("runOutputGuardrails", () => {
  it("flags a dollar figure when get_pricing_guidance was never called", () => {
    const violations = runOutputGuardrails("That'll be $150 for the visit.", []);
    expect(violations.some((v) => v.type === "unsourced_price")).toBe(true);
  });

  it("does not flag a dollar figure when get_pricing_guidance was called", () => {
    const violations = runOutputGuardrails("That'll be $150 for the visit.", ["get_pricing_guidance"]);
    expect(violations.some((v) => v.type === "unsourced_price")).toBe(false);
  });

  it("flags a date/time claim when check_availability was never called", () => {
    const violations = runOutputGuardrails("We can come by tomorrow at 2pm.", []);
    expect(violations.some((v) => v.type === "unsourced_time")).toBe(true);
  });

  it("does not flag a date/time claim when check_availability was called", () => {
    const violations = runOutputGuardrails("We can come by tomorrow at 2pm.", ["check_availability"]);
    expect(violations.some((v) => v.type === "unsourced_time")).toBe(false);
  });

  it("flags equipment-directed repair language even when framed as an instruction to the customer", () => {
    const violations = runOutputGuardrails("Go ahead and check your breaker for now.", []);
    expect(violations.some((v) => v.type === "repair_language")).toBe(true);
  });

  it("flags repair language even when phrased as what a technician will do (intentionally coarse — fails closed)", () => {
    const violations = runOutputGuardrails("Our technician will check the breaker when they arrive.", []);
    expect(violations.some((v) => v.type === "repair_language")).toBe(true);
  });

  it("returns no violations for a clean, plain reply", () => {
    const violations = runOutputGuardrails(
      "Got it, no cool air since this morning. What's the address for the service call?",
      [],
    );
    expect(violations).toHaveLength(0);
  });
});
