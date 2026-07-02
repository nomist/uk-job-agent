import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { Application } from "@/domain/entities/application";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaApplicationRepository } from "@/infrastructure/persistence/prisma/application.repository";
import {
  createTestCompany,
  createTestJobRow,
  createTestProfileRow,
  createTestResumeRow,
  createTestUser,
} from "../support/fixtures";
import { createTestPrismaClient } from "../support/test-prisma-client";

async function seedJobAndResume(prisma: PrismaClient) {
  const user = await createTestUser(prisma);
  const company = await createTestCompany(prisma);
  const job = await createTestJobRow(prisma, company.id);
  const profile = await createTestProfileRow(prisma, user.id);
  const resume = await createTestResumeRow(prisma, profile.id);
  return { user, job, resume };
}

describe("PrismaApplicationRepository", () => {
  const prisma = createTestPrismaClient();
  const repository = new PrismaApplicationRepository(prisma);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("round-trips a freshly created application with its seed history entry", async () => {
    const { user, job, resume } = await seedJobAndResume(prisma);
    const application = Application.create({
      id: randomUUID(),
      userId: user.id,
      jobId: job.id,
      resumeId: resume.id,
      appliedAt: new Date("2026-01-01T00:00:00Z"),
    });

    await repository.save(application);
    const found = await repository.findById(application.id);

    expect(found?.status.value).toBe("APPLIED");
    expect(found?.resumeId).toBe(resume.id);
    expect(found?.statusHistory).toHaveLength(1);
    expect(found?.statusHistory[0]).toEqual({
      from: null,
      to: "APPLIED",
      changedAt: new Date("2026-01-01T00:00:00Z"),
    });
  });

  it("replays a multi-step status history in order after a reload", async () => {
    const { user, job, resume } = await seedJobAndResume(prisma);
    let application = Application.create({
      id: randomUUID(),
      userId: user.id,
      jobId: job.id,
      resumeId: resume.id,
      appliedAt: new Date("2026-01-01T00:00:00Z"),
    });
    application = application.transitionTo(
      "HR_SCREEN",
      new Date("2026-01-05T00:00:00Z"),
      "Recruiter call",
    );
    application = application.transitionTo("TECHNICAL_INTERVIEW", new Date("2026-01-10T00:00:00Z"));
    await repository.save(application);

    const found = await repository.findById(application.id);

    expect(found?.status.value).toBe("TECHNICAL_INTERVIEW");
    expect(found?.statusHistory.map((change) => change.to)).toEqual([
      "APPLIED",
      "HR_SCREEN",
      "TECHNICAL_INTERVIEW",
    ]);
    expect(found?.statusHistory[1].note).toBe("Recruiter call");
    expect(found?.statusHistory[2].from).toBe("HR_SCREEN");
  });

  it("save() replaces history wholesale, so repeated saves stay accurate", async () => {
    const { user, job, resume } = await seedJobAndResume(prisma);
    let application = Application.create({
      id: randomUUID(),
      userId: user.id,
      jobId: job.id,
      resumeId: resume.id,
      appliedAt: new Date("2026-01-01T00:00:00Z"),
    });
    await repository.save(application);

    application = application.transitionTo("REJECTED", new Date("2026-01-02T00:00:00Z"));
    await repository.save(application);

    const found = await repository.findById(application.id);
    expect(found?.statusHistory).toHaveLength(2);
    expect(found?.status.value).toBe("REJECTED");
  });

  it("findByUserAndJob prefers the active application when a terminal one also exists", async () => {
    const { user, job, resume } = await seedJobAndResume(prisma);
    const first = Application.create({
      id: randomUUID(),
      userId: user.id,
      jobId: job.id,
      resumeId: resume.id,
      appliedAt: new Date("2026-01-01T00:00:00Z"),
    });
    await repository.save(first.transitionTo("REJECTED", new Date("2026-01-02T00:00:00Z")));

    const second = Application.create({
      id: randomUUID(),
      userId: user.id,
      jobId: job.id,
      resumeId: resume.id,
      appliedAt: new Date("2026-02-01T00:00:00Z"),
    });
    await repository.save(second);

    const found = await repository.findByUserAndJob(user.id, job.id);
    expect(found?.id).toBe(second.id);
    expect(found?.isActive()).toBe(true);
  });

  it("findByUserAndJob falls back to the most recent row when none are active", async () => {
    const { user, job, resume } = await seedJobAndResume(prisma);
    const first = Application.create({
      id: randomUUID(),
      userId: user.id,
      jobId: job.id,
      resumeId: resume.id,
      appliedAt: new Date("2026-01-01T00:00:00Z"),
    });
    await repository.save(first.transitionTo("REJECTED", new Date("2026-01-02T00:00:00Z")));

    const second = Application.create({
      id: randomUUID(),
      userId: user.id,
      jobId: job.id,
      resumeId: resume.id,
      appliedAt: new Date("2026-02-01T00:00:00Z"),
    });
    await repository.save(second.transitionTo("WITHDRAWN", new Date("2026-02-02T00:00:00Z")));

    const found = await repository.findByUserAndJob(user.id, job.id);
    expect(found?.id).toBe(second.id);
  });

  it("returns null for an unknown application id or (userId, jobId) pair", async () => {
    expect(await repository.findById("missing")).toBeNull();
    expect(await repository.findByUserAndJob("missing", "missing")).toBeNull();
  });

  it("findByUserId returns all of that user's applications, of every status", async () => {
    const { user, job: jobA, resume } = await seedJobAndResume(prisma);
    const company = await createTestCompany(prisma);
    const jobB = await createTestJobRow(prisma, company.id, { externalId: randomUUID() });
    const otherUser = await createTestUser(prisma);

    await repository.save(
      Application.create({
        id: randomUUID(),
        userId: user.id,
        jobId: jobA.id,
        resumeId: resume.id,
        appliedAt: new Date("2026-01-01T00:00:00Z"),
      }),
    );
    await repository.save(
      Application.create({
        id: randomUUID(),
        userId: user.id,
        jobId: jobB.id,
        resumeId: resume.id,
        appliedAt: new Date("2026-01-02T00:00:00Z"),
      }).transitionTo("REJECTED", new Date("2026-01-03T00:00:00Z")),
    );
    await repository.save(
      Application.create({
        id: randomUUID(),
        userId: otherUser.id,
        jobId: jobB.id,
        resumeId: resume.id,
        appliedAt: new Date(),
      }),
    );

    const found = await repository.findByUserId(user.id);

    expect(found).toHaveLength(2);
    expect(found.map((application) => application.status.value).sort()).toEqual([
      "APPLIED",
      "REJECTED",
    ]);
  });

  it("findByUserId returns an empty array for a user with no applications", async () => {
    expect(await repository.findByUserId("missing-user")).toEqual([]);
  });

  it("saves an application whose userId has no pre-existing User row (auto-creates a placeholder)", async () => {
    // Mirrors PrismaSavedJobRepository's fix: no auth exists yet, so
    // callers pass an opaque userId that may not correspond to any
    // existing User row. Must not fail with a foreign key violation.
    const company = await createTestCompany(prisma);
    const job = await createTestJobRow(prisma, company.id);
    const userId = `placeholder-user-${randomUUID()}`;

    await repository.save(
      Application.create({
        id: randomUUID(),
        userId,
        jobId: job.id,
        appliedAt: new Date(),
      }),
    );

    const found = await repository.findByUserId(userId);
    expect(found).toHaveLength(1);

    const userRow = await prisma.user.findUnique({ where: { id: userId } });
    expect(userRow).not.toBeNull();
  });
});
