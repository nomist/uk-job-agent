import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { Resume } from "@/domain/entities/resume";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaResumeRepository } from "@/infrastructure/persistence/prisma/resume.repository";
import { createTestProfileRow, createTestUser } from "../support/fixtures";
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
});
