import { InvalidConfidenceScoreError } from "@/domain/errors/domain-errors";

export const CONFIDENCE_BANDS = ["LOW", "MEDIUM", "HIGH"] as const;

export type ConfidenceBand = (typeof CONFIDENCE_BANDS)[number];

// Thresholds are a domain decision, not derived from the RFC: values below
// 0.4 read as LOW, 0.4-0.7 as MEDIUM, above 0.7 as HIGH.
const HIGH_THRESHOLD = 0.7;
const MEDIUM_THRESHOLD = 0.4;

export class ConfidenceScore {
  private constructor(
    public readonly value: number,
    public readonly band: ConfidenceBand,
  ) {}

  static create(value: number): ConfidenceScore {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new InvalidConfidenceScoreError(
        `Confidence value must be between 0 and 1, got ${value}`,
      );
    }

    return new ConfidenceScore(value, ConfidenceScore.bandFor(value));
  }

  private static bandFor(value: number): ConfidenceBand {
    if (value >= HIGH_THRESHOLD) return "HIGH";
    if (value >= MEDIUM_THRESHOLD) return "MEDIUM";
    return "LOW";
  }

  isHighConfidence(): boolean {
    return this.band === "HIGH";
  }

  equals(other: ConfidenceScore): boolean {
    return this.value === other.value;
  }
}
