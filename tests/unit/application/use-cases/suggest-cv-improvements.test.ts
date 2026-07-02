import { describe, expect, it } from "vitest";
import { Job } from "@/domain/entities/job";
import { Resume } from "@/domain/entities/resume";
import { Location } from "@/domain/value-objects/location";
import { JobNotFoundError, ResumeNotFoundError } from "@/application/errors/application-errors";
import { SuggestCVImprovementsUseCase } from "@/application/use-cases/suggest-cv-improvements.use-case";
import { FakeAiProvider } from "../fakes/fake-ai-provider";
import { InMemoryJobRepository } from "../fakes/in-memory-job-repository";
import { InMemoryResumeRepository } from "../fakes/in-memory-resume-repository";

function buildResumeRepo() {
  const repo = new InMemoryResumeRepository();
  repo.seed(
    Resume.create({
      id: "r1",
      profileId: "p1",
      label: "General",
      content: "content",
      createdAt: new Date(),
    }),
  );
  return repo;
}

function buildJobRepo() {
  const repo = new InMemoryJobRepository();
  repo.seed(
    Job.create({
      id: "j1",
      companyId: "c1",
      provider: "ADZUNA",
      externalId: "j1",
      title: "Staff Engineer",
      description: "desc",
      url: "https://example.com/jobs/1",
      location: Location.create({ country: "UK", isRemote: true }),
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
    }),
  );
  return repo;
}

describe("SuggestCVImprovementsUseCase", () => {
  it("returns suggestions for a general (non-targeted) request", async () => {
    const useCase = new SuggestCVImprovementsUseCase(
      buildResumeRepo(),
      new InMemoryJobRepository(),
      new FakeAiProvider(),
    );

    const result = await useCase.execute({ resumeId: "r1" });

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].category).toBe("wording");
  });

  it("resolves the target job when targetJobId is given", async () => {
    const useCase = new SuggestCVImprovementsUseCase(
      buildResumeRepo(),
      buildJobRepo(),
      new FakeAiProvider(),
    );

    await expect(useCase.execute({ resumeId: "r1", targetJobId: "j1" })).resolves.toBeDefined();
  });

  it("throws if the resume does not exist", async () => {
    const useCase = new SuggestCVImprovementsUseCase(
      new InMemoryResumeRepository(),
      new InMemoryJobRepository(),
      new FakeAiProvider(),
    );

    await expect(useCase.execute({ resumeId: "missing" })).rejects.toThrow(ResumeNotFoundError);
  });

  it("throws if targetJobId is given but not found", async () => {
    const useCase = new SuggestCVImprovementsUseCase(
      buildResumeRepo(),
      new InMemoryJobRepository(),
      new FakeAiProvider(),
    );

    await expect(useCase.execute({ resumeId: "r1", targetJobId: "missing" })).rejects.toThrow(
      JobNotFoundError,
    );
  });
});
