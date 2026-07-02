import { describe, expect, it } from "vitest";
import { Job } from "@/domain/entities/job";
import { Resume } from "@/domain/entities/resume";
import { Location } from "@/domain/value-objects/location";
import {
  DuplicateActiveApplicationError,
  JobNotFoundError,
  ResumeNotFoundError,
} from "@/application/errors/application-errors";
import { CreateApplicationUseCase } from "@/application/use-cases/create-application.use-case";
import { InMemoryApplicationRepository } from "../fakes/in-memory-application-repository";
import { InMemoryJobRepository } from "../fakes/in-memory-job-repository";
import { InMemoryResumeRepository } from "../fakes/in-memory-resume-repository";

function seedJob(repo: InMemoryJobRepository, id = "j1") {
  const job = Job.create({
    id,
    companyId: "c1",
    provider: "ADZUNA",
    externalId: id,
    title: "Staff Engineer",
    description: "desc",
    url: "https://example.com/jobs/1",
    location: Location.create({ country: "UK", isRemote: true }),
    firstSeenAt: new Date(),
    lastSeenAt: new Date(),
  });
  repo.seed(job);
  return job;
}

function seedResume(repo: InMemoryResumeRepository, id = "r1") {
  const resume = Resume.create({
    id,
    profileId: "p1",
    label: "General",
    content: "content",
    createdAt: new Date(),
  });
  repo.seed(resume);
  return resume;
}

describe("CreateApplicationUseCase", () => {
  it("creates an application referencing the given resume", async () => {
    const applicationRepository = new InMemoryApplicationRepository();
    const jobRepository = new InMemoryJobRepository();
    const resumeRepository = new InMemoryResumeRepository();
    seedJob(jobRepository);
    seedResume(resumeRepository);
    const useCase = new CreateApplicationUseCase(
      applicationRepository,
      jobRepository,
      resumeRepository,
    );

    const application = await useCase.execute({ userId: "u1", jobId: "j1", resumeId: "r1" });

    expect(application.status.value).toBe("APPLIED");
    expect(application.resumeId).toBe("r1");
    expect(await applicationRepository.findById(application.id)).toBe(application);
  });

  it("throws if the job does not exist", async () => {
    const resumeRepository = new InMemoryResumeRepository();
    seedResume(resumeRepository);
    const useCase = new CreateApplicationUseCase(
      new InMemoryApplicationRepository(),
      new InMemoryJobRepository(),
      resumeRepository,
    );

    await expect(
      useCase.execute({ userId: "u1", jobId: "missing", resumeId: "r1" }),
    ).rejects.toThrow(JobNotFoundError);
  });

  it("throws if the resume does not exist", async () => {
    const jobRepository = new InMemoryJobRepository();
    seedJob(jobRepository);
    const useCase = new CreateApplicationUseCase(
      new InMemoryApplicationRepository(),
      jobRepository,
      new InMemoryResumeRepository(),
    );

    await expect(
      useCase.execute({ userId: "u1", jobId: "j1", resumeId: "missing" }),
    ).rejects.toThrow(ResumeNotFoundError);
  });

  it("rejects a second active application for the same (userId, jobId)", async () => {
    const applicationRepository = new InMemoryApplicationRepository();
    const jobRepository = new InMemoryJobRepository();
    const resumeRepository = new InMemoryResumeRepository();
    seedJob(jobRepository);
    seedResume(resumeRepository);
    const useCase = new CreateApplicationUseCase(
      applicationRepository,
      jobRepository,
      resumeRepository,
    );

    await useCase.execute({ userId: "u1", jobId: "j1", resumeId: "r1" });

    await expect(useCase.execute({ userId: "u1", jobId: "j1", resumeId: "r1" })).rejects.toThrow(
      DuplicateActiveApplicationError,
    );
  });

  it("allows re-applying after the previous application reached a terminal state", async () => {
    const applicationRepository = new InMemoryApplicationRepository();
    const jobRepository = new InMemoryJobRepository();
    const resumeRepository = new InMemoryResumeRepository();
    seedJob(jobRepository);
    seedResume(resumeRepository);
    const useCase = new CreateApplicationUseCase(
      applicationRepository,
      jobRepository,
      resumeRepository,
    );

    const first = await useCase.execute({ userId: "u1", jobId: "j1", resumeId: "r1" });
    await applicationRepository.save(first.transitionTo("REJECTED", new Date()));

    await expect(
      useCase.execute({ userId: "u1", jobId: "j1", resumeId: "r1" }),
    ).resolves.toBeDefined();
  });
});
