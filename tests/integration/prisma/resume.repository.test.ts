import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { Resume } from "@/domain/entities/resume";
import { RecommendationItem, RecommendationRun } from "@/domain/entities/recommendation-run";
import { ResumeInUseError } from "@/application/errors/application-errors";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaRecommendationRunRepository } from "@/infrastructure/persistence/prisma/recommendation-run.repository";
import { PrismaResumeRepository } from "@/infrastructure/persistence/prisma/resume.repository";
import {
  createTestCompany,
  createTestJobRow,
  createTestProfileRow,
  createTestUser,
} from "../support/fixtures";
import { createTestPrismaClient } from "../support/test-prisma-client";

async function seedProfile(prisma: PrismaClient) {
  const user = await createTestUser(prisma);
  return createTestProfileRow(prisma, user.id);
}

describe("PrismaResumeRepository", () => {
  const prisma = createTestPrismaClient();
  const repository = new PrismaResumeRepository(prisma);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("round-trips parsedSkills and isPrimary", async () => {
    const profile = await seedProfile(prisma);
    const resume = Resume.create({
      id: randomUUID(),
      profileId: profile.id,
      label: "General",
      content: "Staff Engineer, 10 years...",
      parsedSkills: ["TypeScript", "Node.js"],
      isPrimary: true,
      createdAt: new Date(),
    });

    await repository.save(resume);
    const found = await repository.findById(resume.id);

    expect(found?.parsedSkills).toEqual(["TypeScript", "Node.js"]);
    expect(found?.isPrimary).toBe(true);
  });

  it("finds the primary resume for a profile", async () => {
    const profile = await seedProfile(prisma);
    await repository.save(
      Resume.create({
        id: randomUUID(),
        profileId: profile.id,
        label: "Secondary",
        content: "content",
        isPrimary: false,
        createdAt: new Date(),
      }),
    );
    const primary = Resume.create({
      id: randomUUID(),
      profileId: profile.id,
      label: "Primary",
      content: "content",
      isPrimary: true,
      createdAt: new Date(),
    });
    await repository.save(primary);

    const found = await repository.findPrimaryByProfileId(profile.id);
    expect(found?.id).toBe(primary.id);
  });

  it("returns null when no primary resume exists for a profile", async () => {
    const profile = await seedProfile(prisma);
    await repository.save(
      Resume.create({
        id: randomUUID(),
        profileId: profile.id,
        label: "Non-primary",
        content: "content",
        createdAt: new Date(),
      }),
    );

    expect(await repository.findPrimaryByProfileId(profile.id)).toBeNull();
  });

  it("returns null for an unknown id", async () => {
    expect(await repository.findById("missing")).toBeNull();
  });

  it("findByProfileId returns all resumes for a profile, most recently created first", async () => {
    const profile = await seedProfile(prisma);
    const older = Resume.create({
      id: randomUUID(),
      profileId: profile.id,
      label: "Older",
      content: "content",
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });
    const newer = Resume.create({
      id: randomUUID(),
      profileId: profile.id,
      label: "Newer",
      content: "content",
      createdAt: new Date("2026-02-01T00:00:00Z"),
    });
    await repository.save(older);
    await repository.save(newer);

    const found = await repository.findByProfileId(profile.id);

    expect(found.map((resume) => resume.id)).toEqual([newer.id, older.id]);
  });

  it("findByProfileId excludes another profile's resumes", async () => {
    const profileA = await seedProfile(prisma);
    const profileB = await seedProfile(prisma);
    await repository.save(
      Resume.create({
        id: randomUUID(),
        profileId: profileB.id,
        label: "Someone else's resume",
        content: "content",
        createdAt: new Date(),
      }),
    );

    expect(await repository.findByProfileId(profileA.id)).toEqual([]);
  });

  it("delete() removes the resume", async () => {
    const profile = await seedProfile(prisma);
    const resume = Resume.create({
      id: randomUUID(),
      profileId: profile.id,
      label: "To delete",
      content: "content",
      createdAt: new Date(),
    });
    await repository.save(resume);

    await repository.delete(resume.id);

    expect(await repository.findById(resume.id)).toBeNull();
  });

  it("delete() throws ResumeInUseError instead of a raw DB error when a RecommendationRun references it", async () => {
    const profile = await seedProfile(prisma);
    const resume = Resume.create({
      id: randomUUID(),
      profileId: profile.id,
      label: "Scored resume",
      content: "content",
      createdAt: new Date(),
    });
    await repository.save(resume);

    const company = await createTestCompany(prisma);
    const job = await createTestJobRow(prisma, company.id);
    const recommendationRunRepository = new PrismaRecommendationRunRepository(prisma);
    await recommendationRunRepository.save(
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
        items: [RecommendationItem.create({ jobId: job.id, score: 80, reason: "Good fit" })],
      }),
    );

    await expect(repository.delete(resume.id)).rejects.toThrow(ResumeInUseError);
    expect(await repository.findById(resume.id)).not.toBeNull();
  });
});
