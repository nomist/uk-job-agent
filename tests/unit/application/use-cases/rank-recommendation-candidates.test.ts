import { describe, expect, it } from "vitest";
import {
  rankCandidatesForScoring,
  scoreCandidate,
} from "@/application/use-cases/rank-recommendation-candidates";
import { RecommendationSearchFilters } from "@/domain/entities/recommendation-run";
import { Job } from "@/domain/entities/job";
import { Location } from "@/domain/value-objects/location";
import { SalaryRange } from "@/domain/value-objects/salary-range";

const now = new Date("2026-01-15T00:00:00Z");

const baseFilters: RecommendationSearchFilters = {
  skills: [],
  locations: [],
  workModes: [],
  visaStatus: "UNKNOWN",
  maxJobsToScore: 20,
};

function buildJob(overrides: Partial<Parameters<typeof Job.create>[0]> = {}) {
  return Job.create({
    id: "j1",
    companyId: "c1",
    provider: "ADZUNA",
    externalId: "e1",
    title: "Backend Engineer",
    description: "Build APIs with TypeScript and PostgreSQL.",
    location: Location.create({ city: "London", country: "UK", isRemote: false }),
    url: "https://example.com/jobs/1",
    firstSeenAt: now,
    lastSeenAt: now,
    ...overrides,
  });
}

describe("scoreCandidate", () => {
  it("scores title match 1 when every headline word appears in the job title", () => {
    const job = buildJob({ title: "Staff Backend Engineer" });
    const score = scoreCandidate(job, { ...baseFilters, headline: "Backend Engineer" }, now);
    expect(score.title).toBe(1);
  });

  it("scores title match 0.5 (neutral) when there's no headline to compare against", () => {
    const job = buildJob({ title: "Backend Engineer" });
    const score = scoreCandidate(job, baseFilters, now);
    expect(score.title).toBe(0.5);
  });

  it("scores title match partially when only some headline words appear", () => {
    const job = buildJob({ title: "Frontend Developer" });
    const score = scoreCandidate(job, { ...baseFilters, headline: "Backend Engineer" }, now);
    expect(score.title).toBe(0);
  });

  it("scores skill overlap by fraction of profile skills present in title/description", () => {
    const job = buildJob({
      title: "Backend Engineer",
      description: "Build APIs with TypeScript and PostgreSQL.",
    });
    const score = scoreCandidate(
      job,
      { ...baseFilters, skills: ["TypeScript", "PostgreSQL", "Kubernetes", "Rust"] },
      now,
    );
    expect(score.skills).toBe(0.5);
  });

  it("scores skill overlap 0.5 (neutral) when the profile has no skills", () => {
    const job = buildJob();
    expect(scoreCandidate(job, baseFilters, now).skills).toBe(0.5);
  });

  it("scores location match 1 for a remote job regardless of preferred locations", () => {
    const job = buildJob({ location: Location.create({ country: "UK", isRemote: true }) });
    const score = scoreCandidate(job, { ...baseFilters, locations: ["London"] }, now);
    expect(score.location).toBe(1);
  });

  it("scores location match 1 when the job's city matches a preferred location", () => {
    const job = buildJob({
      location: Location.create({ city: "London", country: "UK", isRemote: false }),
    });
    const score = scoreCandidate(job, { ...baseFilters, locations: ["Manchester", "London"] }, now);
    expect(score.location).toBe(1);
  });

  it("scores location match 0 when the job's city matches no preferred location", () => {
    const job = buildJob({
      location: Location.create({ city: "Bristol", country: "UK", isRemote: false }),
    });
    const score = scoreCandidate(job, { ...baseFilters, locations: ["London"] }, now);
    expect(score.location).toBe(0);
  });

  it("scores location match 0.5 (neutral) when no preferred locations are set", () => {
    const job = buildJob();
    expect(scoreCandidate(job, baseFilters, now).location).toBe(0.5);
  });

  it("scores work mode match 1 when the job's work mode is preferred", () => {
    const job = buildJob({ workMode: "REMOTE" });
    const score = scoreCandidate(job, { ...baseFilters, workModes: ["REMOTE", "HYBRID"] }, now);
    expect(score.workMode).toBe(1);
  });

  it("scores work mode match 0 when the job's work mode is not preferred", () => {
    const job = buildJob({ workMode: "ONSITE" });
    const score = scoreCandidate(job, { ...baseFilters, workModes: ["REMOTE"] }, now);
    expect(score.workMode).toBe(0);
  });

  it("scores work mode match 0.5 (neutral) when the job has no work mode set", () => {
    const job = buildJob();
    const score = scoreCandidate(job, { ...baseFilters, workModes: ["REMOTE"] }, now);
    expect(score.workMode).toBe(0.5);
  });

  it("scores salary match 1 when the job's range overlaps the expectation", () => {
    const job = buildJob({
      salaryRange: SalaryRange.create({ min: 55000, max: 75000, currency: "GBP" }),
    });
    const score = scoreCandidate(
      job,
      { ...baseFilters, salaryMin: 60000, salaryMax: 80000, salaryCurrency: "GBP" },
      now,
    );
    expect(score.salary).toBe(1);
  });

  it("scores salary match 0 when the job's range doesn't overlap the expectation", () => {
    const job = buildJob({
      salaryRange: SalaryRange.create({ min: 30000, max: 40000, currency: "GBP" }),
    });
    const score = scoreCandidate(job, { ...baseFilters, salaryMin: 60000 }, now);
    expect(score.salary).toBe(0);
  });

  it("scores salary match 0.5 (neutral) on a currency mismatch", () => {
    const job = buildJob({
      salaryRange: SalaryRange.create({ min: 60000, max: 80000, currency: "USD" }),
    });
    const score = scoreCandidate(
      job,
      { ...baseFilters, salaryMin: 60000, salaryCurrency: "GBP" },
      now,
    );
    expect(score.salary).toBe(0.5);
  });

  it("scores salary match 0.5 (neutral) when neither side has salary info", () => {
    const job = buildJob();
    expect(scoreCandidate(job, baseFilters, now).salary).toBe(0.5);
  });

  it("scores recency 1 for a job posted today and decays toward 0 by 30 days", () => {
    const freshJob = buildJob({ postedAt: now });
    const oldJob = buildJob({ postedAt: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000) });
    expect(scoreCandidate(freshJob, baseFilters, now).recency).toBe(1);
    expect(scoreCandidate(oldJob, baseFilters, now).recency).toBe(0);
  });
});

describe("rankCandidatesForScoring", () => {
  it("sorts jobs by total pre-rank score descending", () => {
    const strongMatch = buildJob({
      id: "strong",
      title: "Backend Engineer",
      workMode: "REMOTE",
      location: Location.create({ country: "UK", isRemote: true }),
    });
    const weakMatch = buildJob({
      id: "weak",
      title: "Marketing Manager",
      workMode: "ONSITE",
      location: Location.create({ city: "Bristol", country: "UK", isRemote: false }),
    });

    const ranked = rankCandidatesForScoring(
      [weakMatch, strongMatch],
      {
        ...baseFilters,
        headline: "Backend Engineer",
        workModes: ["REMOTE"],
        locations: ["London"],
      },
      now,
    );

    expect(ranked.map((job) => job.id)).toEqual(["strong", "weak"]);
  });

  it("returns an empty array for an empty candidate list", () => {
    expect(rankCandidatesForScoring([], baseFilters, now)).toEqual([]);
  });
});
