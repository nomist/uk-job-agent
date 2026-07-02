import { describe, expect, it } from "vitest";
import { Job } from "@/domain/entities/job";
import { Location } from "@/domain/value-objects/location";
import { JobNotFoundError } from "@/application/errors/application-errors";
import { SaveJobUseCase } from "@/application/use-cases/save-job.use-case";
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

describe("SaveJobUseCase", () => {
  it("saves a job for a user", async () => {
    const jobRepository = new InMemoryJobRepository();
    jobRepository.seed(buildJob());
    const savedJobRepository = new InMemorySavedJobRepository();
    const useCase = new SaveJobUseCase(savedJobRepository, jobRepository);

    const record = await useCase.execute({ userId: "u1", jobId: "j1" });

    expect(record.status).toBe("SAVED");
    expect(await savedJobRepository.findByUserAndJob("u1", "j1")).toEqual(record);
  });

  it("throws if the job does not exist", async () => {
    const useCase = new SaveJobUseCase(
      new InMemorySavedJobRepository(),
      new InMemoryJobRepository(),
    );

    await expect(useCase.execute({ userId: "u1", jobId: "missing" })).rejects.toThrow(
      JobNotFoundError,
    );
  });

  it("is idempotent: saving twice preserves the original savedAt", async () => {
    const jobRepository = new InMemoryJobRepository();
    jobRepository.seed(buildJob());
    const savedJobRepository = new InMemorySavedJobRepository();
    const useCase = new SaveJobUseCase(savedJobRepository, jobRepository);

    const first = await useCase.execute({ userId: "u1", jobId: "j1" });
    const second = await useCase.execute({ userId: "u1", jobId: "j1", notes: "Looks great" });

    expect(second.id).toBe(first.id);
    expect(second.savedAt).toEqual(first.savedAt);
    expect(second.notes).toBe("Looks great");
  });

  it("re-saving a dismissed job flips it back to SAVED", async () => {
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
    const useCase = new SaveJobUseCase(savedJobRepository, jobRepository);

    const record = await useCase.execute({ userId: "u1", jobId: "j1" });

    expect(record.status).toBe("SAVED");
    expect(record.id).toBe("sj1");
  });
});
