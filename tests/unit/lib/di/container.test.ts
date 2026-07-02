import { describe, expect, it } from "vitest";
import { createContainer } from "@/lib/di/container";
import { CreateApplicationUseCase } from "@/application/use-cases/create-application.use-case";
import { DismissJobUseCase } from "@/application/use-cases/dismiss-job.use-case";
import { GenerateCoverLetterUseCase } from "@/application/use-cases/generate-cover-letter.use-case";
import { SaveJobUseCase } from "@/application/use-cases/save-job.use-case";
import { ScoreJobMatchUseCase } from "@/application/use-cases/score-job-match.use-case";
import { SearchJobsUseCase } from "@/application/use-cases/search-jobs.use-case";
import { SuggestCVImprovementsUseCase } from "@/application/use-cases/suggest-cv-improvements.use-case";
import { UpdateApplicationStatusUseCase } from "@/application/use-cases/update-application-status.use-case";
import { FakeAiProvider } from "../../application/fakes/fake-ai-provider";
import { FakeJobProvider } from "../../application/fakes/fake-job-provider";
import { InMemoryApplicationRepository } from "../../application/fakes/in-memory-application-repository";
import { InMemoryJobRepository } from "../../application/fakes/in-memory-job-repository";
import { InMemoryProfileRepository } from "../../application/fakes/in-memory-profile-repository";
import { InMemoryResumeRepository } from "../../application/fakes/in-memory-resume-repository";
import { InMemorySavedJobRepository } from "../../application/fakes/in-memory-saved-job-repository";

/**
 * No ADZUNA/REED/OPENAI credentials are set in this test process, and no
 * real Prisma client is touched — construction still succeeds because
 * every infrastructure dependency below is overridden with a fake. This is
 * the primary way the container is tested: hermetically, against the same
 * fakes the use-case unit tests already use.
 */
function buildTestContainer() {
  return createContainer({
    jobRepository: new InMemoryJobRepository(),
    savedJobRepository: new InMemorySavedJobRepository(),
    applicationRepository: new InMemoryApplicationRepository(),
    resumeRepository: new InMemoryResumeRepository(),
    profileRepository: new InMemoryProfileRepository(),
    jobProviders: [new FakeJobProvider("ADZUNA", []), new FakeJobProvider("REED", [])],
    aiProvider: new FakeAiProvider(),
  });
}

describe("createContainer", () => {
  it("constructs every use case without throwing", () => {
    const container = buildTestContainer();

    expect(container.searchJobs()).toBeInstanceOf(SearchJobsUseCase);
    expect(container.saveJob()).toBeInstanceOf(SaveJobUseCase);
    expect(container.dismissJob()).toBeInstanceOf(DismissJobUseCase);
    expect(container.createApplication()).toBeInstanceOf(CreateApplicationUseCase);
    expect(container.updateApplicationStatus()).toBeInstanceOf(UpdateApplicationStatusUseCase);
    expect(container.scoreJobMatch()).toBeInstanceOf(ScoreJobMatchUseCase);
    expect(container.generateCoverLetter()).toBeInstanceOf(GenerateCoverLetterUseCase);
    expect(container.suggestCvImprovements()).toBeInstanceOf(SuggestCVImprovementsUseCase);
  });

  it("returns a fresh use-case instance on every factory call", () => {
    const container = buildTestContainer();
    expect(container.searchJobs()).not.toBe(container.searchJobs());
    expect(container.scoreJobMatch()).not.toBe(container.scoreJobMatch());
  });

  it("does not require any real credentials or database when every dependency is overridden", () => {
    expect(() => buildTestContainer()).not.toThrow();
  });

  it("exposes the wired dependencies for introspection", () => {
    const container = buildTestContainer();
    expect(container.dependencies.jobProviders).toHaveLength(2);
    expect(container.dependencies.aiProvider).toBeInstanceOf(FakeAiProvider);
  });

  it("wires a fully-functional SearchJobsUseCase end to end against fakes", async () => {
    const jobRepository = new InMemoryJobRepository();
    const provider = new FakeJobProvider("ADZUNA", [
      {
        provider: "ADZUNA",
        externalId: "1",
        companyId: "c1",
        title: "Staff Engineer",
        description: "desc",
        url: "https://example.com/jobs/1",
        location: { country: "UK", isRemote: true },
      },
    ]);
    const container = createContainer({
      jobRepository,
      savedJobRepository: new InMemorySavedJobRepository(),
      applicationRepository: new InMemoryApplicationRepository(),
      resumeRepository: new InMemoryResumeRepository(),
      profileRepository: new InMemoryProfileRepository(),
      jobProviders: [provider],
      aiProvider: new FakeAiProvider(),
    });

    const result = await container.searchJobs().execute({});

    expect(result.jobs).toHaveLength(1);
    expect(await jobRepository.findById(result.jobs[0].id)).not.toBeNull();
  });
});
