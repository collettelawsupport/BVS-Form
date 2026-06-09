import { describe, expect, it } from "vitest";
import sampleSubmission from "./fixtures/sample-submission.json";
import { intakeSchema, normalizeUsDateInput } from "../lib/validation/intakeSchema";

describe("intake validation", () => {
  it("normalizes valid US dates", () => {
    expect(normalizeUsDateInput("1/5/2024")).toBe("01/05/2024");
  });

  it("rejects impossible dates", () => {
    expect(normalizeUsDateInput("02/31/2024")).toBeNull();
  });

  it("accepts the sample submission", () => {
    const parsed = intakeSchema.safeParse(sampleSubmission);
    expect(parsed.success).toBe(true);
  });

  it("requires child entries when children are affected", () => {
    const parsed = intakeSchema.safeParse({
      ...sampleSubmission,
      childrenAffected: true,
      children: []
    });

    expect(parsed.success).toBe(false);
  });

  it("does not treat a blank minor-children value as zero", () => {
    const parsed = intakeSchema.safeParse({
      ...sampleSubmission,
      marriage: {
        ...sampleSubmission.marriage,
        numberOfMinorChildren: ""
      }
    });

    expect(parsed.success).toBe(false);
  });
});
