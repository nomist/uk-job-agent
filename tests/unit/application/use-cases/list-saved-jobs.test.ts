import { describe, expect, it } from "vitest";
import { Job } from "@/domain/entities/job";
import { Location } from "@/domain/value-objects/location";
import { ListSavedJobsUseCase } from "@/application/use-cases/list-saved-jobs.use-case";
import { InMemoryJobRepository } from "../fakes/in-memory-job-repository";
import { InMemorySavedJobRepository } from "../fakes/in-memory-saved-job-repository";

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

describe("ListSavedJobsUseCase", () => {
  it("returns saved jobs enriched with their Job details", async () => {
    const jobRepository = new InMemoryJobRepository();
    jobRepository.seed(buildJob());
    const savedJobRepository = new InMemorySavedJobRepository();
    await savedJobRepository.save({
      id: "sj1",
      userId: "u1",
      jobId: "j1",
      status: "SAVED",
      savedAt: new Date("2026-01-01T00:00:00Z"),
    });
    const useCase = new ListSavedJobsUseCase(savedJobRepository, jobRepository);

    const results = await useCase.execute({ userId: "u1" });

    expect(results).toHaveLength(1);
    expect(results[0].savedJob.jobId).toBe("j1");
    expect(results[0].job.id).toBe("j1");
    expect(results[0].job.title).toBe("Staff Engineer");
  });

  it("excludes dismissed jobs", async () => {
    const jobRepository = new InMemoryJobRepository();
    jobRepository.seed(buildJob());
    const savedJobRepository = new InMemorySavedJobRepository();
    await savedJobRepository.save({
      id: "sj1",
      userId: "u1",
      jobId: "j1",
      status: "DISMISSED",
      savedAt: new Date(),
    });
    const useCase = new ListSavedJobsUseCase(savedJobRepository, jobRepository);

    const results = await useCase.execute({ userId: "u1" });

    expect(results).toEqual([]);
  });

  it("excludes another user's saved jobs", async () => {
    const jobRepository = new InMemoryJobRepository();
    jobRepository.seed(buildJob());
    const savedJobRepository = new InMemorySavedJobRepository();
    await savedJobRepository.save({
      id: "sj1",
      userId: "someone-else",
      jobId: "j1",
      status: "SAVED",
      savedAt: new Date(),
    });
    const useCase = new ListSavedJobsUseCase(savedJobRepository, jobRepository);

    const results = await useCase.execute({ userId: "u1" });

    expect(results).toEqual([]);
  });

  it("skips a saved job whose underlying Job record is missing, without throwing", async () => {
    const jobRepository = new InMemoryJobRepository();
    const savedJobRepository = new InMemorySavedJobRepository();
    await savedJobRepository.save({
      id: "sj1",
      userId: "u1",
      jobId: "missing-job",
      status: "SAVED",
      savedAt: new Date(),
    });
    const useCase = new ListSavedJobsUseCase(savedJobRepository, jobRepository);

    const results = await useCase.execute({ userId: "u1" });

    expect(results).toEqual([]);
  });

  it("returns saved jobs most-recently-saved first", async () => {
    const jobRepository = new InMemoryJobRepository();
    jobRepository.seed(buildJob({ id: "j1", externalId: "ext-1" }));
    jobRepository.seed(buildJob({ id: "j2", externalId: "ext-2", title: "Other role" }));
    const savedJobRepository = new InMemorySavedJobRepository();
    await savedJobRepository.save({
      id: "sj1",
      userId: "u1",
      jobId: "j1",
      status: "SAVED",
      savedAt: new Date("2026-01-01T00:00:00Z"),
    });
    await savedJobRepository.save({
      id: "sj2",
      userId: "u1",
      jobId: "j2",
      status: "SAVED",
      savedAt: new Date("2026-02-01T00:00:00Z"),
    });
    const useCase = new ListSavedJobsUseCase(savedJobRepository, jobRepository);

    const results = await useCase.execute({ userId: "u1" });

    expect(results.map((result) => result.job.id)).toEqual(["j2", "j1"]);
  });

  it("returns an empty array when the user has no saved jobs", async () => {
    const useCase = new ListSavedJobsUseCase(
      new InMemorySavedJobRepository(),
      new InMemoryJobRepository(),
    );

    const results = await useCase.execute({ userId: "u1" });

    expect(results).toEqual([]);
  });
});
