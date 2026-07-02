import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { Job } from "@/domain/entities/job";
import { Location } from "@/domain/value-objects/location";
import { SalaryRange } from "@/domain/value-objects/salary-range";
import { PrismaJobRepository } from "@/infrastructure/persistence/prisma/job.repository";
import { createTestCompany } from "../support/fixtures";
import { createTestPrismaClient } from "../support/test-prisma-client";

describe("PrismaJobRepository", () => {
  const prisma = createTestPrismaClient();
  const repository = new PrismaJobRepository(prisma);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("round-trips a job with a salary range and optional fields", async () => {
    const company = await createTestCompany(prisma);
    const job = Job.create({
      id: randomUUID(),
      companyId: company.id,
      provider: "ADZUNA",
      externalId: randomUUID(),
      title: "Staff Engineer",
      description: "Build things.",
      url: "https://example.com/jobs/1",
      location: Location.create({ city: "London", country: "UK", isRemote: false }),
      firstSeenAt: new Date("2026-01-01T00:00:00Z"),
      lastSeenAt: new Date("2026-01-01T00:00:00Z"),
      salaryRange: SalaryRange.create({ min: 60000, max: 80000, currency: "GBP" }),
      workMode: "ONSITE",
      employmentType: "FULL_TIME",
    });

    await repository.save(job);
    const found = await repository.findById(job.id);

    expect(found).not.toBeNull();
    expect(found?.title).toBe("Staff Engineer");
    expect(found?.salaryRange?.min).toBe(60000);
    expect(found?.salaryRange?.currency).toBe("GBP");
    expect(found?.location.city).toBe("London");
    expect(found?.workMode).toBe("ONSITE");
    expect(found?.employmentType).toBe("FULL_TIME");
  });

  it("round-trips a job with no salary and a remote-only location", async () => {
    const company = await createTestCompany(prisma);
    const job = Job.create({
      id: randomUUID(),
      companyId: company.id,
      provider: "REED",
      externalId: randomUUID(),
      title: "Backend Engineer",
      description: "desc",
      url: "https://example.com/jobs/2",
      location: Location.create({ country: "UK", isRemote: true }),
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
    });

    await repository.save(job);
    const found = await repository.findById(job.id);

    expect(found?.salaryRange).toBeUndefined();
    expect(found?.location.isRemote).toBe(true);
    expect(found?.location.city).toBeUndefined();
    expect(found?.employmentType).toBeUndefined();
  });

  it("finds a job by (provider, externalId)", async () => {
    const company = await createTestCompany(prisma);
    const externalId = randomUUID();
    const job = Job.create({
      id: randomUUID(),
      companyId: company.id,
      provider: "ADZUNA",
      externalId,
      title: "Staff Engineer",
      description: "desc",
      url: "https://example.com/jobs/3",
      location: Location.create({ country: "UK", isRemote: true }),
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
    });
    await repository.save(job);

    const found = await repository.findByProviderListing("ADZUNA", externalId);
    expect(found?.id).toBe(job.id);
  });

  it("returns null for an unknown id or listing", async () => {
    expect(await repository.findById("missing")).toBeNull();
    expect(await repository.findByProviderListing("ADZUNA", "missing")).toBeNull();
  });

  it("saveMany persists multiple jobs and preserves a canonicalJobId self-reference", async () => {
    const company = await createTestCompany(prisma);
    const canonical = Job.create({
      id: randomUUID(),
      companyId: company.id,
      provider: "ADZUNA",
      externalId: randomUUID(),
      title: "Staff Engineer",
      description: "desc",
      url: "https://example.com/jobs/4",
      location: Location.create({ country: "UK", isRemote: true }),
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
    });
    const duplicate = Job.create({
      id: randomUUID(),
      companyId: company.id,
      provider: "REED",
      externalId: randomUUID(),
      title: "Staff Engineer",
      description: "desc",
      url: "https://example.com/jobs/5",
      location: Location.create({ country: "UK", isRemote: true }),
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
    }).assignToCanonical(canonical.id);

    await repository.saveMany([canonical, duplicate]);

    const found = await repository.findById(duplicate.id);
    expect(found?.canonicalJobId).toBe(canonical.id);
  });

  it("updates an existing job in place on save (upsert)", async () => {
    const company = await createTestCompany(prisma);
    const job = Job.create({
      id: randomUUID(),
      companyId: company.id,
      provider: "ADZUNA",
      externalId: randomUUID(),
      title: "Staff Engineer",
      description: "desc",
      url: "https://example.com/jobs/6",
      location: Location.create({ country: "UK", isRemote: true }),
      firstSeenAt: new Date("2026-01-01T00:00:00Z"),
      lastSeenAt: new Date("2026-01-01T00:00:00Z"),
    });
    await repository.save(job);

    const resighted = job.recordSighting(new Date("2026-01-05T00:00:00Z"));
    await repository.save(resighted);

    const found = await repository.findById(job.id);
    expect(found?.lastSeenAt).toEqual(new Date("2026-01-05T00:00:00Z"));
    expect(found?.isExpired).toBe(false);
  });
});
