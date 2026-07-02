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
});
