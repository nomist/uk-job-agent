import { describe, expect, it } from "vitest";
import { InvalidConfidenceScoreError } from "@/domain/errors/domain-errors";
import { ConfidenceScore } from "@/domain/value-objects/confidence-score";

describe("ConfidenceScore", () => {
  it("derives LOW band below 0.4", () => {
    expect(ConfidenceScore.create(0.1).band).toBe("LOW");
    expect(ConfidenceScore.create(0.39).band).toBe("LOW");
  });

  it("derives MEDIUM band between 0.4 and 0.7", () => {
    expect(ConfidenceScore.create(0.4).band).toBe("MEDIUM");
    expect(ConfidenceScore.create(0.69).band).toBe("MEDIUM");
  });

  it("derives HIGH band at or above 0.7", () => {
    expect(ConfidenceScore.create(0.7).band).toBe("HIGH");
    expect(ConfidenceScore.create(1).band).toBe("HIGH");
  });

  it("isHighConfidence reflects the band", () => {
    expect(ConfidenceScore.create(0.9).isHighConfidence()).toBe(true);
    expect(ConfidenceScore.create(0.5).isHighConfidence()).toBe(false);
  });

  it("rejects values outside [0, 1]", () => {
    expect(() => ConfidenceScore.create(-0.01)).toThrow(InvalidConfidenceScoreError);
    expect(() => ConfidenceScore.create(1.01)).toThrow(InvalidConfidenceScoreError);
  });

  it("rejects non-finite values", () => {
    expect(() => ConfidenceScore.create(Number.NaN)).toThrow(InvalidConfidenceScoreError);
  });
});
