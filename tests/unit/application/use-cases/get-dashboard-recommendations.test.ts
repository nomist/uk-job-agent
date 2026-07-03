import { describe, expect, it } from "vitest";
import { Job } from "@/domain/entities/job";
import { Profile } from "@/domain/entities/profile";
import { RecommendationItem, RecommendationRun } from "@/domain/entities/recommendation-run";
import { Resume } from "@/domain/entities/resume";
import { Location } from "@/domain/value-objects/location";
import { GetDashboardRecommendationsUseCase } from "@/application/use-cases/get-dashboard-recommendations.use-case";
import { InMemoryJobRepository } from "../fakes/in-memory-job-repository";
import { InMemoryProfileRepository } from "../fakes/in-memory-profile-repository";
import { InMemoryRecommendationRunRepository } from "../fakes/in-memory-recommendation-run-repository";
import { InMemoryResumeRepository } from "../fakes/in-memory-resume-repository";

const now = new Date("2026-01-15T00:00:00Z");

function buildHarness() {
  const profileRepository = new InMemoryProfileRepository();
  const resumeRepository = new InMemoryResumeRepository();
  const recommendationRunRepository = new InMemoryRecommendationRunRepository();
  const jobRepository = new InMemoryJobRepository();
  const useCase = new GetDashboardRecommendationsUseCase(
    profileRepository,
    resumeRepository,
    recommendationRunRepository,
    jobRepository,
  );
  return {
    profileRepository,
    resumeRepository,
    recommendationRunRepository,
    jobRepository,
    useCase,
  };
}

describe("GetDashboardRecommendationsUseCase", () => {
  it("returns nulls (no error) when the user has no Profile yet", async () => {
    const { useCase } = buildHarness();
    const result = await useCase.execute("u1");
    expect(result).toEqual({
      profile: null,
      primaryResume: null,
      latestRun: null,
      jobsById: new Map(),
    });
  });

  it("returns a null primaryResume when the Profile has no primary Resume yet", async () => {
    const { useCase, profileRepository } = buildHarness();
    profileRepository.seed(Profile.create({ id: "p1", userId: "u1", updatedAt: now }));

    const result = await useCase.execute("u1");

    expect(result.profile).not.toBeNull();
    expect(result.primaryResume).toBeNull();
    expect(result.latestRun).toBeNull();
  });

  it("returns a null latestRun when none has ever been saved", async () => {
    const { useCase, profileRepository, resumeRepository } = buildHarness();
    profileRepository.seed(Profile.create({ id: "p1", userId: "u1", updatedAt: now }));
    resumeRepository.seed(
      Resume.create({
        id: "r1",
        profileId: "p1",
        label: "Primary",
        content: "c",
        isPrimary: true,
        createdAt: now,
      }),
    );

    const result = await useCase.execute("u1");

    expect(result.profile).not.toBeNull();
    expect(result.primaryResume).not.toBeNull();
    expect(result.latestRun).toBeNull();
  });

  it("hydrates full Job details for the latest run's items", async () => {
    const {
      useCase,
      profileRepository,
      resumeRepository,
      recommendationRunRepository,
      jobRepository,
    } = buildHarness();
    profileRepository.seed(Profile.create({ id: "p1", userId: "u1", updatedAt: now }));
    resumeRepository.seed(
      Resume.create({
        id: "r1",
        profileId: "p1",
        label: "Primary",
        content: "c",
        isPrimary: true,
        createdAt: now,
      }),
    );
    jobRepository.seed(
      Job.create({
        id: "j1",
        companyId: "c1",
        provider: "ADZUNA",
        externalId: "e1",
        title: "Backend Engineer",
        description: "desc",
        url: "https://example.com/jobs/1",
        location: Location.create({ country: "UK", isRemote: true }),
        firstSeenAt: now,
        lastSeenAt: now,
      }),
    );
    recommendationRunRepository.seed(
      RecommendationRun.create({
        id: "run1",
        profileId: "p1",
        resumeId: "r1",
        createdAt: now,
        searchFilters: {
          skills: [],
          locations: [],
          workModes: [],
          visaStatus: "UNKNOWN",
          maxJobsToScore: 20,
        },
        rawResultCount: 1,
        candidateCount: 1,
        selectedForScoringCount: 1,
        scoredCount: 1,
        failedCount: 0,
        items: [RecommendationItem.create({ jobId: "j1", score: 80, reason: "Good fit" })],
      }),
    );

    const result = await useCase.execute("u1");

    expect(result.latestRun?.id).toBe("run1");
    expect(result.jobsById.get("j1")?.title).toBe("Backend Engineer");
  });

  it("skips a run item whose Job has since been deleted, instead of throwing", async () => {
    const { useCase, profileRepository, resumeRepository, recommendationRunRepository } =
      buildHarness();
    profileRepository.seed(Profile.create({ id: "p1", userId: "u1", updatedAt: now }));
    resumeRepository.seed(
      Resume.create({
        id: "r1",
        profileId: "p1",
        label: "Primary",
        content: "c",
        isPrimary: true,
        createdAt: now,
      }),
    );
    recommendationRunRepository.seed(
      RecommendationRun.create({
        id: "run1",
        profileId: "p1",
        resumeId: "r1",
        createdAt: now,
        searchFilters: {
          skills: [],
          locations: [],
          workModes: [],
          visaStatus: "UNKNOWN",
          maxJobsToScore: 20,
        },
        rawResultCount: 1,
        candidateCount: 1,
        selectedForScoringCount: 1,
        scoredCount: 1,
        failedCount: 0,
        items: [RecommendationItem.create({ jobId: "missing-job", score: 80, reason: "Good fit" })],
      }),
    );

    const result = await useCase.execute("u1");

    expect(result.latestRun).not.toBeNull();
    expect(result.jobsById.size).toBe(0);
  });
});
