import { describe, expect, it } from "vitest";
import { Job } from "@/domain/entities/job";
import { Location } from "@/domain/value-objects/location";
import { JobNotFoundError } from "@/application/errors/application-errors";
import { DismissJobUseCase } from "@/application/use-cases/dismiss-job.use-case";
import { InMemoryJobRepository } from "../fakes/in-memory-job-repository";
import { InMemorySavedJobRepository } from "../fakes/in-memory-saved-job-repository";

const buildJob = () =>
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
  });

describe("DismissJobUseCase", () => {
  it("marks a job as dismissed for the user", async () => {
    const jobRepository = new InMemoryJobRepository();
    jobRepository.seed(buildJob());
    const savedJobRepository = new InMemorySavedJobRepository();
    const useCase = new DismissJobUseCase(savedJobRepository, jobRepository);

    const record = await useCase.execute({ userId: "u1", jobId: "j1" });

    expect(record.status).toBe("DISMISSED");
  });

  it("throws if the job does not exist", async () => {
    const useCase = new DismissJobUseCase(
      new InMemorySavedJobRepository(),
      new InMemoryJobRepository(),
    );

    await expect(useCase.execute({ userId: "u1", jobId: "missing" })).rejects.toThrow(
      JobNotFoundError,
    );
  });

  it("dismissing a previously saved job flips its status without losing its id", async () => {
    const jobRepository = new InMemoryJobRepository();
    jobRepository.seed(buildJob());
    const savedJobRepository = new InMemorySavedJobRepository();
    await savedJobRepository.save({
      id: "sj1",
      userId: "u1",
      jobId: "j1",
      status: "SAVED",
      savedAt: new Date(),
    });
    const useCase = new DismissJobUseCase(savedJobRepository, jobRepository);

    const record = await useCase.execute({ userId: "u1", jobId: "j1" });

    expect(record.status).toBe("DISMISSED");
    expect(record.id).toBe("sj1");
  });
});
