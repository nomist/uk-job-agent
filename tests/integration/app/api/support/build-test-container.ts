import { Container, createContainer } from "@/lib/di/container";
import { FakeAiProvider } from "../../../../unit/application/fakes/fake-ai-provider";
import { FakeJobProvider } from "../../../../unit/application/fakes/fake-job-provider";
import { InMemoryApplicationRepository } from "../../../../unit/application/fakes/in-memory-application-repository";
import { InMemoryJobRepository } from "../../../../unit/application/fakes/in-memory-job-repository";
import { InMemoryProfileRepository } from "../../../../unit/application/fakes/in-memory-profile-repository";
import { InMemoryResumeRepository } from "../../../../unit/application/fakes/in-memory-resume-repository";
import { InMemorySavedJobRepository } from "../../../../unit/application/fakes/in-memory-saved-job-repository";

export interface TestContainerHandles {
  container: Container;
  jobRepository: InMemoryJobRepository;
  savedJobRepository: InMemorySavedJobRepository;
  applicationRepository: InMemoryApplicationRepository;
  resumeRepository: InMemoryResumeRepository;
  profileRepository: InMemoryProfileRepository;
  jobProviders: FakeJobProvider[];
  aiProvider: FakeAiProvider;
}

/**
 * Builds a container wired entirely to the same in-memory fakes the
 * use-case unit tests use (Milestone 3), via createContainer's override
 * mechanism — no real database, HTTP, or AI provider is ever touched.
 * Route handler tests point getContainer() at this via vi.mock.
 */
export function buildTestContainer(
  overrides: { jobProviders?: FakeJobProvider[] } = {},
): TestContainerHandles {
  const jobRepository = new InMemoryJobRepository();
  const savedJobRepository = new InMemorySavedJobRepository();
  const applicationRepository = new InMemoryApplicationRepository();
  const resumeRepository = new InMemoryResumeRepository();
  const profileRepository = new InMemoryProfileRepository();
  const jobProviders = overrides.jobProviders ?? [
    new FakeJobProvider("ADZUNA", []),
    new FakeJobProvider("REED", []),
  ];
  const aiProvider = new FakeAiProvider();

  const container = createContainer({
    jobRepository,
    savedJobRepository,
    applicationRepository,
    resumeRepository,
    profileRepository,
    jobProviders,
    aiProvider,
  });

  return {
    container,
    jobRepository,
    savedJobRepository,
    applicationRepository,
    resumeRepository,
    profileRepository,
    jobProviders,
    aiProvider,
  };
}
