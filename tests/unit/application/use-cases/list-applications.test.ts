import { describe, expect, it } from "vitest";
import { Application } from "@/domain/entities/application";
import { Job } from "@/domain/entities/job";
import { Location } from "@/domain/value-objects/location";
import { ListApplicationsUseCase } from "@/application/use-cases/list-applications.use-case";
import { InMemoryApplicationRepository } from "../fakes/in-memory-application-repository";
import { InMemoryJobRepository } from "../fakes/in-memory-job-repository";

const buildJob = (overrides: Partial<Parameters<typeof Job.create>[0]> = {}) =>
  Job.create({
    id: "j1",
    companyId: "c1",
    provider: "ADZUNA",
    externalId: "ext-1",
    title: "Staff Engineer",
    description: "desc",
    url: "https://example.com/jobs/1",
    location: Location.create({ country: "UK", isRemote: true }),
    firstSeenAt: new Date(),
    lastSeenAt: new Date(),
    ...overrides,
  });

const buildApplication = (overrides: Partial<Parameters<typeof Application.create>[0]> = {}) =>
  Application.create({
    id: "a1",
    userId: "u1",
    jobId: "j1",
    appliedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  });

describe("ListApplicationsUseCase", () => {
  it("returns applications enriched with their Job details", async () => {
    const jobRepository = new InMemoryJobRepository();
    jobRepository.seed(buildJob());
    const applicationRepository = new InMemoryApplicationRepository();
    await applicationRepository.save(buildApplication());
    const useCase = new ListApplicationsUseCase(applicationRepository, jobRepository);

    const results = await useCase.execute({ userId: "u1" });

    expect(results).toHaveLength(1);
    expect(results[0].application.jobId).toBe("j1");
    expect(results[0].job.title).toBe("Staff Engineer");
  });

  it("includes applications of every status (no filtering)", async () => {
    const jobRepository = new InMemoryJobRepository();
    jobRepository.seed(buildJob({ id: "j1", externalId: "ext-1" }));
    jobRepository.seed(buildJob({ id: "j2", externalId: "ext-2" }));
    const applicationRepository = new InMemoryApplicationRepository();
    await applicationRepository.save(buildApplication({ id: "a1", jobId: "j1" }));
    await applicationRepository.save(
      buildApplication({ id: "a2", jobId: "j2" }).transitionTo("REJECTED", new Date()),
    );
    const useCase = new ListApplicationsUseCase(applicationRepository, jobRepository);

    const results = await useCase.execute({ userId: "u1" });

    expect(results.map((r) => r.application.status.value).sort()).toEqual(["APPLIED", "REJECTED"]);
  });

  it("excludes another user's applications", async () => {
    const jobRepository = new InMemoryJobRepository();
    jobRepository.seed(buildJob());
    const applicationRepository = new InMemoryApplicationRepository();
    await applicationRepository.save(buildApplication({ userId: "someone-else" }));
    const useCase = new ListApplicationsUseCase(applicationRepository, jobRepository);

    const results = await useCase.execute({ userId: "u1" });

    expect(results).toEqual([]);
  });

  it("skips an application whose underlying Job record is missing, without throwing", async () => {
    const applicationRepository = new InMemoryApplicationRepository();
    await applicationRepository.save(buildApplication({ jobId: "missing-job" }));
    const useCase = new ListApplicationsUseCase(applicationRepository, new InMemoryJobRepository());

    const results = await useCase.execute({ userId: "u1" });

    expect(results).toEqual([]);
  });

  it("returns applications most-recently-applied first", async () => {
    const jobRepository = new InMemoryJobRepository();
    jobRepository.seed(buildJob({ id: "j1", externalId: "ext-1" }));
    jobRepository.seed(buildJob({ id: "j2", externalId: "ext-2" }));
    const applicationRepository = new InMemoryApplicationRepository();
    await applicationRepository.save(
      buildApplication({ id: "a1", jobId: "j1", appliedAt: new Date("2026-01-01T00:00:00Z") }),
    );
    await applicationRepository.save(
      buildApplication({ id: "a2", jobId: "j2", appliedAt: new Date("2026-02-01T00:00:00Z") }),
    );
    const useCase = new ListApplicationsUseCase(applicationRepository, jobRepository);

    const results = await useCase.execute({ userId: "u1" });

    expect(results.map((r) => r.application.id)).toEqual(["a2", "a1"]);
  });

  it("returns an empty array when the user has no applications", async () => {
    const useCase = new ListApplicationsUseCase(
      new InMemoryApplicationRepository(),
      new InMemoryJobRepository(),
    );

    const results = await useCase.execute({ userId: "u1" });

    expect(results).toEqual([]);
  });
});
