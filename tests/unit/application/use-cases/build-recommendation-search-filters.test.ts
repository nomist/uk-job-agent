import { describe, expect, it } from "vitest";
import {
  buildProviderSearchQueries,
  buildRecommendationSearchFilters,
  RECOMMENDATION_MAX_JOBS_TO_SCORE_CAP,
} from "@/application/use-cases/build-recommendation-search-filters";
import { Profile } from "@/domain/entities/profile";
import { Resume } from "@/domain/entities/resume";
import { SalaryRange } from "@/domain/value-objects/salary-range";

const now = new Date("2026-01-01T00:00:00Z");

function buildProfile(overrides: Partial<Parameters<typeof Profile.create>[0]> = {}) {
  return Profile.create({ id: "p1", userId: "u1", updatedAt: now, ...overrides });
}

function buildResume(overrides: Partial<Parameters<typeof Resume.create>[0]> = {}) {
  return Resume.create({
    id: "r1",
    profileId: "p1",
    label: "Primary",
    content: "content",
    createdAt: now,
    ...overrides,
  });
}

describe("buildRecommendationSearchFilters", () => {
  it("prefills every field from the Profile and primary Resume", () => {
    const profile = buildProfile({
      headline: "Staff Backend Engineer",
      skills: ["TypeScript", "PostgreSQL"],
      preferredLocations: ["London", "Manchester"],
      workPreferences: ["REMOTE", "HYBRID"],
      salaryExpectation: SalaryRange.create({ min: 60000, max: 90000, currency: "GBP" }),
      visaStatus: "NO_SPONSORSHIP_NEEDED",
      yearsOfExperience: 8,
    });
    const resume = buildResume({ parsedSkills: ["Node.js"] });

    const filters = buildRecommendationSearchFilters(profile, resume);

    expect(filters).toEqual({
      headline: "Staff Backend Engineer",
      skills: ["TypeScript", "PostgreSQL", "Node.js"],
      locations: ["London", "Manchester"],
      workModes: ["REMOTE", "HYBRID"],
      salaryMin: 60000,
      salaryMax: 90000,
      salaryCurrency: "GBP",
      visaStatus: "NO_SPONSORSHIP_NEEDED",
      yearsOfExperience: 8,
      maxJobsToScore: 20,
    });
  });

  it("dedupes skills between Profile and Resume case-insensitively", () => {
    const profile = buildProfile({ skills: ["TypeScript", "React"] });
    const resume = buildResume({ parsedSkills: ["typescript", "GraphQL"] });

    const filters = buildRecommendationSearchFilters(profile, resume);

    expect(filters.skills).toEqual(["TypeScript", "React", "GraphQL"]);
  });

  it("lets a user-adjusted override win over the Profile-derived default", () => {
    const profile = buildProfile({ preferredLocations: ["London"] });
    const resume = buildResume();

    const filters = buildRecommendationSearchFilters(profile, resume, {
      locations: ["Berlin"],
      headline: "Custom headline",
    });

    expect(filters.locations).toEqual(["Berlin"]);
    expect(filters.headline).toBe("Custom headline");
  });

  it("hard-caps maxJobsToScore at 20 even when a larger override is requested", () => {
    const filters = buildRecommendationSearchFilters(buildProfile(), buildResume(), {
      maxJobsToScore: 500,
    });

    expect(filters.maxJobsToScore).toBe(RECOMMENDATION_MAX_JOBS_TO_SCORE_CAP);
    expect(filters.maxJobsToScore).toBe(20);
  });

  it("floors maxJobsToScore at 1 when a non-positive override is requested", () => {
    const filters = buildRecommendationSearchFilters(buildProfile(), buildResume(), {
      maxJobsToScore: 0,
    });

    expect(filters.maxJobsToScore).toBe(1);
  });

  it("defaults maxJobsToScore to 20 when no override is given", () => {
    const filters = buildRecommendationSearchFilters(buildProfile(), buildResume());
    expect(filters.maxJobsToScore).toBe(20);
  });

  it("leaves headline/salary undefined when the Profile has none set", () => {
    const filters = buildRecommendationSearchFilters(buildProfile(), buildResume());
    expect(filters.headline).toBeUndefined();
    expect(filters.salaryMin).toBeUndefined();
    expect(filters.salaryMax).toBeUndefined();
  });
});

describe("buildProviderSearchQueries", () => {
  it("builds one query per preferred location, up to 3", () => {
    const filters = buildRecommendationSearchFilters(
      Profile.create({
        id: "p1",
        userId: "u1",
        updatedAt: now,
        preferredLocations: ["London", "Manchester", "Bristol", "Leeds"],
      }),
      buildResume(),
    );

    const queries = buildProviderSearchQueries(filters);

    expect(queries).toHaveLength(3);
    expect(queries.map((q) => q.location)).toEqual(["London", "Manchester", "Bristol"]);
  });

  it("builds a single broad query with no location when the Profile has none set", () => {
    const filters = buildRecommendationSearchFilters(buildProfile(), buildResume());

    const queries = buildProviderSearchQueries(filters);

    expect(queries).toHaveLength(1);
    expect(queries[0].location).toBeUndefined();
  });

  it("uses the headline as keywords when present", () => {
    const filters = buildRecommendationSearchFilters(
      buildProfile({ headline: "Staff Backend Engineer", skills: ["TypeScript"] }),
      buildResume(),
    );

    const [query] = buildProviderSearchQueries(filters);
    expect(query.keywords).toBe("Staff Backend Engineer");
  });

  it("falls back to the first 3 skills as keywords when there's no headline", () => {
    const filters = buildRecommendationSearchFilters(
      buildProfile({ skills: ["TypeScript", "PostgreSQL", "AWS", "Kubernetes"] }),
      buildResume(),
    );

    const [query] = buildProviderSearchQueries(filters);
    expect(query.keywords).toBe("TypeScript PostgreSQL AWS");
  });

  it("leaves keywords undefined when there's neither a headline nor skills", () => {
    const filters = buildRecommendationSearchFilters(buildProfile(), buildResume());
    const [query] = buildProviderSearchQueries(filters);
    expect(query.keywords).toBeUndefined();
  });

  it("passes salaryMin through to every generated query", () => {
    const filters = buildRecommendationSearchFilters(
      buildProfile({
        preferredLocations: ["London", "Manchester"],
        salaryExpectation: SalaryRange.create({ min: 50000, max: 70000, currency: "GBP" }),
      }),
      buildResume(),
    );

    const queries = buildProviderSearchQueries(filters);
    expect(queries.every((q) => q.salaryMin === 50000)).toBe(true);
  });
});
