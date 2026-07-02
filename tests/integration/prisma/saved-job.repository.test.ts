import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaSavedJobRepository } from "@/infrastructure/persistence/prisma/saved-job.repository";
import { createTestCompany, createTestJobRow, createTestUser } from "../support/fixtures";
import { createTestPrismaClient } from "../support/test-prisma-client";

describe("PrismaSavedJobRepository", () => {
  const prisma = createTestPrismaClient();
  const repository = new PrismaSavedJobRepository(prisma);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("saves and finds a record by (userId, jobId)", async () => {
    const user = await createTestUser(prisma);
    const company = await createTestCompany(prisma);
    const job = await createTestJobRow(prisma, company.id);

    await repository.save({
      id: randomUUID(),
      userId: user.id,
      jobId: job.id,
      status: "SAVED",
      savedAt: new Date(),
      notes: "Looks great",
    });

    const found = await repository.findByUserAndJob(user.id, job.id);
    expect(found?.status).toBe("SAVED");
    expect(found?.notes).toBe("Looks great");
  });

  it("upserts by (userId, jobId): saving again updates status rather than duplicating", async () => {
    const user = await createTestUser(prisma);
    const company = await createTestCompany(prisma);
    const job = await createTestJobRow(prisma, company.id);
    const id = randomUUID();

    await repository.save({
      id,
      userId: user.id,
      jobId: job.id,
      status: "SAVED",
      savedAt: new Date("2026-01-01T00:00:00Z"),
    });
    await repository.save({
      id,
      userId: user.id,
      jobId: job.id,
      status: "DISMISSED",
      savedAt: new Date("2026-01-01T00:00:00Z"),
    });

    const found = await repository.findByUserAndJob(user.id, job.id);
    expect(found?.status).toBe("DISMISSED");
    expect(found?.id).toBe(id);
  });

  it("returns null for an unknown pair", async () => {
    expect(await repository.findByUserAndJob("missing", "missing")).toBeNull();
  });

  it("findByUserId returns all records (SAVED and DISMISSED) for that user only", async () => {
    const user = await createTestUser(prisma);
    const otherUser = await createTestUser(prisma);
    const company = await createTestCompany(prisma);
    const jobA = await createTestJobRow(prisma, company.id, { externalId: randomUUID() });
    const jobB = await createTestJobRow(prisma, company.id, { externalId: randomUUID() });
    const jobC = await createTestJobRow(prisma, company.id, { externalId: randomUUID() });

    await repository.save({
      id: randomUUID(),
      userId: user.id,
      jobId: jobA.id,
      status: "SAVED",
      savedAt: new Date(),
    });
    await repository.save({
      id: randomUUID(),
      userId: user.id,
      jobId: jobB.id,
      status: "DISMISSED",
      savedAt: new Date(),
    });
    await repository.save({
      id: randomUUID(),
      userId: otherUser.id,
      jobId: jobC.id,
      status: "SAVED",
      savedAt: new Date(),
    });

    const records = await repository.findByUserId(user.id);

    expect(records).toHaveLength(2);
    expect(records.map((record) => record.jobId).sort()).toEqual([jobA.id, jobB.id].sort());
  });

  it("findByUserId returns an empty array for a user with no records", async () => {
    expect(await repository.findByUserId("missing-user")).toEqual([]);
  });

  it("saves a record whose userId has no pre-existing User row (auto-creates a placeholder)", async () => {
    // Mirrors real usage: no auth exists yet, so callers pass an opaque
    // userId (see src/lib/api/current-user.ts) that may not correspond to
    // any existing User row. This must not fail with a foreign key
    // constraint violation (same category of gap as Job.companyId — see
    // PrismaJobRepository's ensureCompaniesExist).
    const company = await createTestCompany(prisma);
    const job = await createTestJobRow(prisma, company.id);
    const userId = `placeholder-user-${randomUUID()}`;

    await repository.save({
      id: randomUUID(),
      userId,
      jobId: job.id,
      status: "SAVED",
      savedAt: new Date(),
    });

    const found = await repository.findByUserAndJob(userId, job.id);
    expect(found?.status).toBe("SAVED");

    const userRow = await prisma.user.findUnique({ where: { id: userId } });
    expect(userRow).not.toBeNull();
  });
});
