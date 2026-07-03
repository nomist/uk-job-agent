import { describe, expect, it } from "vitest";
import { Application } from "@/domain/entities/application";
import { Profile } from "@/domain/entities/profile";
import { RecommendationRun } from "@/domain/entities/recommendation-run";
import { Resume } from "@/domain/entities/resume";
import { JobProviderListing } from "@/application/dto/job-provider.dto";
import { SavedJobRecord } from "@/application/dto/saved-job.dto";
import { ProfileNotFoundError, ResumeNotFoundError } from "@/application/errors/application-errors";
import { ScoreJobMatchUseCase } from "@/application/use-cases/score-job-match.use-case";
import { RunRecommendationsUseCase } from "@/application/use-cases/run-recommendations.use-case";
import { SearchJobsUseCase } from "@/application/use-cases/search-jobs.use-case";
import { FakeAiProvider } from "../fakes/fake-ai-provider";
import { FakeJobProvider } from "../fakes/fake-job-provider";
import { InMemoryApplicationRepository } from "../fakes/in-memory-application-repository";
import { InMemoryJobRepository } from "../fakes/in-memory-job-repository";
import { InMemoryProfileRepository } from "../fakes/in-memory-profile-repository";
import { InMemoryRecommendationRunRepository } from "../fakes/in-memory-recommendation-run-repository";
import { InMemoryResumeRepository } from "../fakes/in-memory-resume-repository";
import { InMemorySavedJobRepository } from "../fakes/in-memory-saved-job-repository";

const now = new Date("2026-01-15T00:00:00Z");

const baseListing = (overrides: Partial<JobProviderListing> = {}): JobProviderListing => ({
  provider: "ADZUNA",
  externalId: "ext-1",
  companyId: "c1",
  title: "Backend Engineer",
  description: "Build APIs with TypeScript.",
  url: "https://example.com/jobs/1",
  location: { city: "London", country: "UK", isRemote: false },
  ...overrides,
});

function buildHarness(options: { jobProviders?: FakeJobProvider[] } = {}) {
  const profileRepository = new InMemoryProfileRepository();
  const resumeRepository = new InMemoryResumeRepository();
  const jobRepository = new InMemoryJobRepository();
  const savedJobRepository = new InMemorySavedJobRepository();
  const applicationRepository = new InMemoryApplicationRepository();
  const recommendationRunRepository = new InMemoryRecommendationRunRepository();
  const aiProvider = new FakeAiProvider();

  const jobProviders = options.jobProviders ?? [new FakeJobProvider("ADZUNA", [baseListing()])];
  const searchJobsUseCase = new SearchJobsUseCase(jobProviders, jobRepository, () => now);
  const scoreJobMatchUseCase = new ScoreJobMatchUseCase(
    jobRepository,
    profileRepository,
    resumeRepository,
    aiProvider,
    () => now,
  );

  const useCase = new RunRecommendationsUseCase(
    profileRepository,
    resumeRepository,
    searchJobsUseCase,
    savedJobRepository,
    applicationRepository,
    scoreJobMatchUseCase,
    recommendationRunRepository,
    () => now,
  );

  const profile = Profile.create({
    id: "p1",
    userId: "u1",
    updatedAt: now,
    headline: "Backend Engineer",
    skills: ["TypeScript"],
  });
  profileRepository.seed(profile);

  const resume = Resume.create({
    id: "res1",
    profileId: "p1",
    label: "Primary",
    content: "content",
    isPrimary: true,
    createdAt: now,
  });
  resumeRepository.seed(resume);

  return {
    profileRepository,
    resumeRepository,
    jobRepository,
    savedJobRepository,
    applicationRepository,
    recommendationRunRepository,
    aiProvider,
    useCase,
    profile,
    resume,
  };
}

describe("RunRecommendationsUseCase", () => {
  it("throws ProfileNotFoundError when the profile does not exist", async () => {
    const { useCase } = buildHarness();
    await expect(useCase.execute({ profileId: "missing" })).rejects.toThrow(ProfileNotFoundError);
  });

  it("throws ResumeNotFoundError when the profile has no primary resume", async () => {
    const { useCase, profileRepository } = buildHarness();
    profileRepository.seed(Profile.create({ id: "p2", userId: "u2", updatedAt: now }));
    await expect(useCase.execute({ profileId: "p2" })).rejects.toThrow(ResumeNotFoundError);
  });

  it("builds a run using Profile-derived filters and returns scored, ranked items", async () => {
    const { useCase, recommendationRunRepository } = buildHarness();

    const run = await useCase.execute({ profileId: "p1" });

    expect(run).toBeInstanceOf(RecommendationRun);
    expect(run.profileId).toBe("p1");
    expect(run.resumeId).toBe("res1");
    expect(run.items).toHaveLength(1);
    expect(run.items[0].score).toBe(80);
    expect(run.scoredCount).toBe(1);
    expect(run.failedCount).toBe(0);
    expect(await recommendationRunRepository.findLatestByProfileId("p1")).not.toBeNull();
  });

  it("excludes dismissed jobs from candidates", async () => {
    const { useCase, savedJobRepository, jobRepository } = buildHarness();
    const run = await useCase.execute({ profileId: "p1" });
    const jobId = run.items[0].jobId;

    const dismissedJob: SavedJobRecord = {
      id: "sj1",
      userId: "u1",
      jobId,
      status: "DISMISSED",
      savedAt: now,
    };
    await savedJobRepository.save(dismissedJob);

    const second = await useCase.execute({ profileId: "p1" });
    expect(second.candidateCount).toBe(0);
    expect(second.items).toHaveLength(0);
    expect(await jobRepository.findById(jobId)).not.toBeNull();
  });

  it("does not recommend a job that no longer appears in provider search results", async () => {
    // SearchJobsUseCase's own recordSighting() un-expires any job a live
    // search still returns, so "expired" candidates are excluded by
    // absence (they stop appearing in search results) rather than by an
    // isExpired check surviving into the candidate set — this exercises
    // that observable behavior: a job that drops out of search results
    // stops being recommended.
    const { useCase } = buildHarness({ jobProviders: [new FakeJobProvider("ADZUNA", [])] });

    const run = await useCase.execute({ profileId: "p1" });

    expect(run.rawResultCount).toBe(0);
    expect(run.candidateCount).toBe(0);
    expect(run.items).toHaveLength(0);
  });

  it("excludes already-applied jobs from candidates", async () => {
    const { useCase, applicationRepository } = buildHarness();
    const first = await useCase.execute({ profileId: "p1" });

    await applicationRepository.save(
      Application.create({
        id: "app1",
        userId: "u1",
        jobId: first.items[0].jobId,
        resumeId: "res1",
        appliedAt: now,
      }),
    );

    const second = await useCase.execute({ profileId: "p1" });
    expect(second.candidateCount).toBe(0);
  });

  it("caps selectedForScoringCount at the (overridden) maxJobsToScore", async () => {
    const jobProviders = [
      new FakeJobProvider("ADZUNA", [
        baseListing({ externalId: "a" }),
        baseListing({ externalId: "b" }),
        baseListing({ externalId: "c" }),
      ]),
    ];
    const { useCase } = buildHarness({ jobProviders });

    const run = await useCase.execute({ profileId: "p1", filters: { maxJobsToScore: 2 } });

    expect(run.searchFilters.maxJobsToScore).toBe(2);
    expect(run.selectedForScoringCount).toBe(2);
    expect(run.candidateCount).toBe(3);
  });

  it("reuses a recent score instead of calling the AI provider again", async () => {
    const { useCase, aiProvider } = buildHarness();

    const first = await useCase.execute({ profileId: "p1" });
    expect(aiProvider.scoreMatchCallCount).toBe(1);

    const second = await useCase.execute({ profileId: "p1" });
    expect(aiProvider.scoreMatchCallCount).toBe(1);
    expect(second.items[0].score).toBe(first.items[0].score);
    expect(second.items[0].jobId).toBe(first.items[0].jobId);
  });

  it("bypasses the recent-score cache and calls the AI provider again when forceRescore is set", async () => {
    const { useCase, aiProvider } = buildHarness();

    await useCase.execute({ profileId: "p1" });
    expect(aiProvider.scoreMatchCallCount).toBe(1);

    await useCase.execute({ profileId: "p1", forceRescore: true });
    expect(aiProvider.scoreMatchCallCount).toBe(2);
  });

  it("counts a failed AI scoring call in failedCount without aborting the run", async () => {
    const jobProviders = [
      new FakeJobProvider("ADZUNA", [
        baseListing({ externalId: "ok" }),
        baseListing({ externalId: "fails" }),
      ]),
    ];
    const { useCase, aiProvider } = buildHarness({ jobProviders });
    aiProvider.scoreMatchImpl = async (request) => {
      if (request.job.externalId === "fails") {
        throw new Error("OpenAI rate limit exceeded");
      }
      return aiProvider.scoreMatchResponse;
    };

    const run = await useCase.execute({ profileId: "p1" });

    expect(run.selectedForScoringCount).toBe(2);
    expect(run.scoredCount).toBe(1);
    expect(run.failedCount).toBe(1);
    expect(run.items).toHaveLength(1);
  });

  it("deduplicates a job returned by multiple location-based queries", async () => {
    const { useCase, profileRepository } = buildHarness();
    profileRepository.seed(
      Profile.create({
        id: "p1",
        userId: "u1",
        updatedAt: now,
        headline: "Backend Engineer",
        preferredLocations: ["London", "Manchester"],
      }),
    );

    const run = await useCase.execute({ profileId: "p1" });

    // Two location queries hit the same FakeJobProvider, which always
    // returns the same single listing — rawResultCount sums both query
    // results, but candidateCount/items reflect the deduplicated job.
    expect(run.rawResultCount).toBe(2);
    expect(run.candidateCount).toBe(1);
    expect(run.items).toHaveLength(1);
  });

  it("persists the searchFilters snapshot on the saved run", async () => {
    const { useCase } = buildHarness();
    const run = await useCase.execute({ profileId: "p1", filters: { locations: ["Berlin"] } });
    expect(run.searchFilters.locations).toEqual(["Berlin"]);
  });
});
