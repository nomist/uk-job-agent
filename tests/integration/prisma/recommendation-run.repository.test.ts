import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { RecommendationItem, RecommendationRun } from "@/domain/entities/recommendation-run";
import { PrismaRecommendationRunRepository } from "@/infrastructure/persistence/prisma/recommendation-run.repository";
import {
  createTestCompany,
  createTestJobRow,
  createTestProfileRow,
  createTestResumeRow,
  createTestUser,
} from "../support/fixtures";
import { createTestPrismaClient } from "../support/test-prisma-client";

async function buildFixtures(prisma: ReturnType<typeof createTestPrismaClient>) {
  const user = await createTestUser(prisma);
  const profile = await createTestProfileRow(prisma, user.id);
  const resume = await createTestResumeRow(prisma, profile.id, { isPrimary: true });
  const company = await createTestCompany(prisma);
  const job = await createTestJobRow(prisma, company.id);
  return { profile, resume, job };
}

describe("PrismaRecommendationRunRepository", () => {
  const prisma = createTestPrismaClient();
  const repository = new PrismaRecommendationRunRepository(prisma);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("round-trips a run with its items, including the searchFilters snapshot", async () => {
    const { profile, resume, job } = await buildFixtures(prisma);
    const now = new Date("2026-01-15T00:00:00Z");

    const run = RecommendationRun.create({
      id: randomUUID(),
      profileId: profile.id,
      resumeId: resume.id,
      createdAt: now,
      searchFilters: {
        headline: "Backend Engineer",
        skills: ["TypeScript"],
        locations: ["London"],
        workModes: ["REMOTE"],
        salaryMin: 60000,
        visaStatus: "UNKNOWN",
        maxJobsToScore: 20,
      },
      rawResultCount: 12,
      candidateCount: 8,
      selectedForScoringCount: 5,
      scoredCount: 4,
      failedCount: 1,
      items: [
        RecommendationItem.create({
          jobId: job.id,
          score: 85,
          reason: "Strong skill overlap.",
          missingSkills: ["Kubernetes"],
        }),
      ],
    });

    await repository.save(run);
    const found = await repository.findLatestByProfileId(profile.id);

    expect(found?.id).toBe(run.id);
    expect(found?.rawResultCount).toBe(12);
    expect(found?.candidateCount).toBe(8);
    expect(found?.selectedForScoringCount).toBe(5);
    expect(found?.scoredCount).toBe(4);
    expect(found?.failedCount).toBe(1);
    expect(found?.searchFilters).toEqual(run.searchFilters);
    expect(found?.items).toHaveLength(1);
    expect(found?.items[0].jobId).toBe(job.id);
    expect(found?.items[0].score).toBe(85);
    expect(found?.items[0].missingSkills).toEqual(["Kubernetes"]);
  });

  it("returns null when the profile has no runs", async () => {
    expect(await repository.findLatestByProfileId("missing")).toBeNull();
  });

  it("returns the most recently created run for a profile with multiple runs", async () => {
    const { profile, resume, job } = await buildFixtures(prisma);
    const older = RecommendationRun.create({
      id: randomUUID(),
      profileId: profile.id,
      resumeId: resume.id,
      createdAt: new Date("2026-01-01T00:00:00Z"),
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
      items: [RecommendationItem.create({ jobId: job.id, score: 50, reason: "older run" })],
    });
    const newer = RecommendationRun.create({
      id: randomUUID(),
      profileId: profile.id,
      resumeId: resume.id,
      createdAt: new Date("2026-01-10T00:00:00Z"),
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
      items: [RecommendationItem.create({ jobId: job.id, score: 90, reason: "newer run" })],
    });

    await repository.save(older);
    await repository.save(newer);

    const found = await repository.findLatestByProfileId(profile.id);
    expect(found?.id).toBe(newer.id);
  });

  describe("findRecentScores", () => {
    it("returns only jobs scored on/after sinceDate, keyed by jobId", async () => {
      const { profile, resume, job } = await buildFixtures(prisma);
      const run = RecommendationRun.create({
        id: randomUUID(),
        profileId: profile.id,
        resumeId: resume.id,
        createdAt: new Date("2026-01-10T00:00:00Z"),
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
        items: [RecommendationItem.create({ jobId: job.id, score: 77, reason: "recent" })],
      });
      await repository.save(run);

      const recent = await repository.findRecentScores(
        profile.id,
        resume.id,
        [job.id],
        new Date("2026-01-01T00:00:00Z"),
      );
      const tooOld = await repository.findRecentScores(
        profile.id,
        resume.id,
        [job.id],
        new Date("2026-01-15T00:00:00Z"),
      );

      expect(recent.get(job.id)?.score).toBe(77);
      expect(recent.get(job.id)?.reason).toBe("recent");
      expect(tooOld.has(job.id)).toBe(false);
    });

    it("returns an empty map for a different (profileId, resumeId) pair", async () => {
      const { profile, resume, job } = await buildFixtures(prisma);
      await repository.save(
        RecommendationRun.create({
          id: randomUUID(),
          profileId: profile.id,
          resumeId: resume.id,
          createdAt: new Date(),
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
          items: [RecommendationItem.create({ jobId: job.id, score: 70, reason: "reason" })],
        }),
      );

      const result = await repository.findRecentScores(
        "other-profile",
        resume.id,
        [job.id],
        new Date("2020-01-01T00:00:00Z"),
      );
      expect(result.size).toBe(0);
    });

    it("returns the most recent score when the same job was scored in more than one run", async () => {
      const { profile, resume, job } = await buildFixtures(prisma);
      await repository.save(
        RecommendationRun.create({
          id: randomUUID(),
          profileId: profile.id,
          resumeId: resume.id,
          createdAt: new Date("2026-01-01T00:00:00Z"),
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
          items: [RecommendationItem.create({ jobId: job.id, score: 60, reason: "first" })],
        }),
      );
      await repository.save(
        RecommendationRun.create({
          id: randomUUID(),
          profileId: profile.id,
          resumeId: resume.id,
          createdAt: new Date("2026-01-05T00:00:00Z"),
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
          items: [
            RecommendationItem.create({ jobId: job.id, score: 95, reason: "second, most recent" }),
          ],
        }),
      );

      const result = await repository.findRecentScores(
        profile.id,
        resume.id,
        [job.id],
        new Date("2020-01-01T00:00:00Z"),
      );
      expect(result.get(job.id)?.score).toBe(95);
      expect(result.get(job.id)?.reason).toBe("second, most recent");
    });

    it("returns an empty map immediately for an empty jobIds list", async () => {
      const { profile, resume } = await buildFixtures(prisma);
      const result = await repository.findRecentScores(profile.id, resume.id, [], new Date());
      expect(result.size).toBe(0);
    });
  });
});
