import { describe, expect, it } from "vitest";
import { MatchScore } from "@/domain/entities/match-score";
import { InvalidMatchScoreError } from "@/domain/errors/domain-errors";
import { ConfidenceScore } from "@/domain/value-objects/confidence-score";

describe("MatchScore", () => {
  const now = new Date("2026-01-01T00:00:00Z");

  const build = (overrides: Partial<Parameters<typeof MatchScore.create>[0]> = {}) =>
    MatchScore.create({
      id: "m1",
      jobId: "j1",
      profileId: "p1",
      resumeId: "r1",
      score: 82,
      confidence: ConfidenceScore.create(0.75),
      rationale: "Strong overlap on backend skills.",
      modelVersion: "claude-sonnet-5",
      generatedAt: now,
      ...overrides,
    });

  it("creates a match score that defaults isLatest to true", () => {
    expect(build().isLatest).toBe(true);
  });

  it("defaults strengths, weaknesses, and missingSkills to empty arrays", () => {
    const matchScore = build();
    expect(matchScore.strengths).toEqual([]);
    expect(matchScore.weaknesses).toEqual([]);
    expect(matchScore.missingSkills).toEqual([]);
  });

  it("stores strengths and weaknesses when provided", () => {
    const matchScore = build({
      strengths: ["Strong TypeScript background"],
      weaknesses: ["Limited leadership experience"],
    });
    expect(matchScore.strengths).toEqual(["Strong TypeScript background"]);
    expect(matchScore.weaknesses).toEqual(["Limited leadership experience"]);
  });

  it("rejects a score outside 0-100", () => {
    expect(() => build({ score: 101 })).toThrow(InvalidMatchScoreError);
    expect(() => build({ score: -1 })).toThrow(InvalidMatchScoreError);
  });

  it("rejects a non-integer score", () => {
    expect(() => build({ score: 82.5 })).toThrow(InvalidMatchScoreError);
  });

  it("rejects an empty rationale", () => {
    expect(() => build({ rationale: "  " })).toThrow(InvalidMatchScoreError);
  });

  describe("markSuperseded", () => {
    it("returns a new instance with isLatest false, leaving the original untouched", () => {
      const original = build({ strengths: ["TypeScript"], weaknesses: ["Leadership"] });
      const superseded = original.markSuperseded();

      expect(original.isLatest).toBe(true);
      expect(superseded.isLatest).toBe(false);
      expect(superseded).not.toBe(original);
      expect(superseded.score).toBe(original.score);
      expect(superseded.strengths).toEqual(original.strengths);
      expect(superseded.weaknesses).toEqual(original.weaknesses);
    });
  });
});
