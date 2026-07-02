import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { Profile } from "@/domain/entities/profile";
import { SalaryRange } from "@/domain/value-objects/salary-range";
import { PrismaProfileRepository } from "@/infrastructure/persistence/prisma/profile.repository";
import { createTestUser } from "../support/fixtures";
import { createTestPrismaClient } from "../support/test-prisma-client";

describe("PrismaProfileRepository", () => {
  const prisma = createTestPrismaClient();
  const repository = new PrismaProfileRepository(prisma);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("round-trips skills, work preferences, and salary expectation", async () => {
    const user = await createTestUser(prisma);
    const profile = Profile.create({
      id: randomUUID(),
      userId: user.id,
      headline: "Staff Engineer",
      yearsOfExperience: 10,
      skills: ["TypeScript", "React"],
      workPreferences: ["REMOTE", "HYBRID"],
      visaStatus: "NO_SPONSORSHIP_NEEDED",
      salaryExpectation: SalaryRange.create({ min: 90000, max: 120000, currency: "GBP" }),
      updatedAt: new Date(),
    });

    await repository.save(profile);
    const found = await repository.findById(profile.id);

    expect(found?.skills).toEqual(["TypeScript", "React"]);
    expect(found?.workPreferences).toEqual(["REMOTE", "HYBRID"]);
    expect(found?.salaryExpectation?.min).toBe(90000);
    expect(found?.salaryExpectation?.max).toBe(120000);
    expect(found?.visaStatus).toBe("NO_SPONSORSHIP_NEEDED");
    expect(found?.isEligibleForMatching()).toBe(true);
  });

  it("round-trips a minimal profile with defaults", async () => {
    const user = await createTestUser(prisma);
    const profile = Profile.create({ id: randomUUID(), userId: user.id, updatedAt: new Date() });

    await repository.save(profile);
    const found = await repository.findById(profile.id);

    expect(found?.skills).toEqual([]);
    expect(found?.workPreferences).toEqual([]);
    expect(found?.salaryExpectation).toBeUndefined();
    expect(found?.visaStatus).toBe("UNKNOWN");
    expect(found?.isEligibleForMatching()).toBe(false);
  });

  it("finds a profile by userId", async () => {
    const user = await createTestUser(prisma);
    const profile = Profile.create({ id: randomUUID(), userId: user.id, updatedAt: new Date() });
    await repository.save(profile);

    const found = await repository.findByUserId(user.id);
    expect(found?.id).toBe(profile.id);
  });

  it("returns null for an unknown id or userId", async () => {
    expect(await repository.findById("missing")).toBeNull();
    expect(await repository.findByUserId("missing")).toBeNull();
  });

  it("updates an existing profile in place on save (upsert)", async () => {
    const user = await createTestUser(prisma);
    const profile = Profile.create({ id: randomUUID(), userId: user.id, updatedAt: new Date() });
    await repository.save(profile);

    const updated = Profile.create({
      id: profile.id,
      userId: user.id,
      headline: "Updated headline",
      updatedAt: new Date(),
    });
    await repository.save(updated);

    const found = await repository.findById(profile.id);
    expect(found?.headline).toBe("Updated headline");
  });
});
