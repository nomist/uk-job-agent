import { describe, expect, it } from "vitest";
import { RecommendationItem, RecommendationRun } from "@/domain/entities/recommendation-run";
import {
  InvalidRecommendationItemError,
  InvalidRecommendationRunError,
} from "@/domain/errors/domain-errors";

describe("RecommendationItem", () => {
  const build = (overrides: Partial<Parameters<typeof RecommendationItem.create>[0]> = {}) =>
    RecommendationItem.create({
      jobId: "j1",
      score: 82,
      reason: "Strong overlap on backend skills.",
      ...overrides,
    });

  it("defaults missingSkills to an empty array", () => {
    expect(build().missingSkills).toEqual([]);
  });

  it("stores missingSkills when provided", () => {
    expect(build({ missingSkills: ["Kubernetes"] }).missingSkills).toEqual(["Kubernetes"]);
  });

  it("rejects an empty jobId", () => {
    expect(() => build({ jobId: "  " })).toThrow(InvalidRecommendationItemError);
  });

  it("rejects an empty reason", () => {
    expect(() => build({ reason: "  " })).toThrow(InvalidRecommendationItemError);
  });

  it.each([-1, 101, 50.5])("rejects an out-of-range or non-integer score (%s)", (score) => {
    expect(() => build({ score })).toThrow(InvalidRecommendationItemError);
  });
});

describe("RecommendationRun", () => {
  const now = new Date("2026-01-01T00:00:00Z");

  const baseFilters = {
    skills: ["TypeScript"],
    locations: ["London"],
    workModes: ["REMOTE"] as ("REMOTE" | "HYBRID" | "ONSITE")[],
    visaStatus: "UNKNOWN" as const,
    maxJobsToScore: 20,
  };

  const build = (overrides: Partial<Parameters<typeof RecommendationRun.create>[0]> = {}) =>
    RecommendationRun.create({
      id: "r1",
      profileId: "p1",
      resumeId: "res1",
      createdAt: now,
      searchFilters: baseFilters,
      rawResultCount: 40,
      candidateCount: 25,
      selectedForScoringCount: 20,
      scoredCount: 18,
      failedCount: 2,
      items: [],
      ...overrides,
    });

  it("sorts items by score descending regardless of input order", () => {
    const run = build({
      items: [
        RecommendationItem.create({ jobId: "low", score: 40, reason: "ok fit" }),
        RecommendationItem.create({ jobId: "high", score: 90, reason: "great fit" }),
        RecommendationItem.create({ jobId: "mid", score: 65, reason: "decent fit" }),
      ],
    });

    expect(run.items.map((item) => item.jobId)).toEqual(["high", "mid", "low"]);
  });

  it("rejects an empty id, profileId, or resumeId", () => {
    expect(() => build({ id: " " })).toThrow(InvalidRecommendationRunError);
    expect(() => build({ profileId: " " })).toThrow(InvalidRecommendationRunError);
    expect(() => build({ resumeId: " " })).toThrow(InvalidRecommendationRunError);
  });

  it.each([
    "rawResultCount",
    "candidateCount",
    "selectedForScoringCount",
    "scoredCount",
    "failedCount",
  ] as const)("rejects a negative %s", (field) => {
    expect(() => build({ [field]: -1 })).toThrow(InvalidRecommendationRunError);
  });

  it("rejects scoredCount + failedCount exceeding selectedForScoringCount", () => {
    expect(() => build({ selectedForScoringCount: 5, scoredCount: 4, failedCount: 3 })).toThrow(
      InvalidRecommendationRunError,
    );
  });

  it("allows scoredCount + failedCount to equal selectedForScoringCount", () => {
    expect(() =>
      build({ selectedForScoringCount: 5, scoredCount: 3, failedCount: 2 }),
    ).not.toThrow();
  });

  it("preserves the searchFilters snapshot verbatim", () => {
    const run = build();
    expect(run.searchFilters).toEqual(baseFilters);
  });
});
