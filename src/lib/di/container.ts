import { AiProvider } from "@/application/ports/ai-provider.port";
import { ApplicationRepository } from "@/application/ports/application-repository.port";
import { JobProvider } from "@/application/ports/job-provider.port";
import { JobRepository } from "@/application/ports/job-repository.port";
import { ProfileRepository } from "@/application/ports/profile-repository.port";
import { ResumeRepository } from "@/application/ports/resume-repository.port";
import { SavedJobRepository } from "@/application/ports/saved-job-repository.port";
import { CreateApplicationUseCase } from "@/application/use-cases/create-application.use-case";
import { DismissJobUseCase } from "@/application/use-cases/dismiss-job.use-case";
import { GenerateCoverLetterUseCase } from "@/application/use-cases/generate-cover-letter.use-case";
import { SaveJobUseCase } from "@/application/use-cases/save-job.use-case";
import { ScoreJobMatchUseCase } from "@/application/use-cases/score-job-match.use-case";
import { SearchJobsUseCase } from "@/application/use-cases/search-jobs.use-case";
import { SuggestCVImprovementsUseCase } from "@/application/use-cases/suggest-cv-improvements.use-case";
import { UpdateApplicationStatusUseCase } from "@/application/use-cases/update-application-status.use-case";
import { PrismaClient } from "@/generated/prisma/client";
import { AdzunaJobProvider } from "@/infrastructure/job-providers/adzuna/adzuna-provider";
import { ReedJobProvider } from "@/infrastructure/job-providers/reed/reed-provider";
import { OpenAiProvider } from "@/infrastructure/llm/openai/openai-provider";
import { prisma as sharedPrisma } from "@/infrastructure/persistence/prisma/client";
import { PrismaApplicationRepository } from "@/infrastructure/persistence/prisma/application.repository";
import { PrismaJobRepository } from "@/infrastructure/persistence/prisma/job.repository";
import { PrismaProfileRepository } from "@/infrastructure/persistence/prisma/profile.repository";
import { PrismaResumeRepository } from "@/infrastructure/persistence/prisma/resume.repository";
import { PrismaSavedJobRepository } from "@/infrastructure/persistence/prisma/saved-job.repository";

export interface ContainerDependencies {
  prisma: PrismaClient;
  jobRepository: JobRepository;
  savedJobRepository: SavedJobRepository;
  applicationRepository: ApplicationRepository;
  resumeRepository: ResumeRepository;
  profileRepository: ProfileRepository;
  jobProviders: readonly JobProvider[];
  aiProvider: AiProvider;
}

export interface Container {
  /** Exposed for introspection/testing — not part of the use-case surface. */
  readonly dependencies: ContainerDependencies;
  /**
   * Optionally scoped to a subset of provider names (e.g. `["ADZUNA"]`) —
   * lets a caller (the `?provider=` query param on GET /api/jobs) narrow
   * which providers a search hits, without SearchJobsUseCase itself
   * needing a provider-filter concept.
   */
  searchJobs(providerNames?: readonly string[]): SearchJobsUseCase;
  saveJob(): SaveJobUseCase;
  dismissJob(): DismissJobUseCase;
  createApplication(): CreateApplicationUseCase;
  updateApplicationStatus(): UpdateApplicationStatusUseCase;
  scoreJobMatch(): ScoreJobMatchUseCase;
  generateCoverLetter(): GenerateCoverLetterUseCase;
  suggestCvImprovements(): SuggestCVImprovementsUseCase;
}

/**
 * Composition root: the only place that knows both the application ports
 * and their concrete infrastructure implementations.
 *
 * Deliberately does NOT instantiate a module-level default container (no
 * `export const container = createContainer()`) — doing so would construct
 * AdzunaJobProvider/ReedJobProvider/OpenAiProvider (and therefore validate
 * their env vars) merely by importing this file, which would break any
 * caller — including tests — that wants to override those dependencies
 * with fakes. Each call builds its own set of dependencies; the shared
 * Prisma client is the one exception (see below).
 *
 * No other global mutable state is introduced: repositories and providers
 * are stateless wrappers (safe to construct freely or share), and each
 * factory method below returns a brand-new use-case instance per call.
 */
export function createContainer(overrides: Partial<ContainerDependencies> = {}): Container {
  const prismaClient = overrides.prisma ?? sharedPrisma;

  const dependencies: ContainerDependencies = {
    prisma: prismaClient,
    jobRepository: overrides.jobRepository ?? new PrismaJobRepository(prismaClient),
    savedJobRepository: overrides.savedJobRepository ?? new PrismaSavedJobRepository(prismaClient),
    applicationRepository:
      overrides.applicationRepository ?? new PrismaApplicationRepository(prismaClient),
    resumeRepository: overrides.resumeRepository ?? new PrismaResumeRepository(prismaClient),
    profileRepository: overrides.profileRepository ?? new PrismaProfileRepository(prismaClient),
    // Adding a new job provider is one more entry here — SearchJobsUseCase
    // already accepts any number of JobProvider implementations.
    jobProviders: overrides.jobProviders ?? [new AdzunaJobProvider(), new ReedJobProvider()],
    // Swappable: replace or add to this single line to introduce
    // Claude/Anthropic alongside or instead of OpenAI. AiProvider is the
    // only thing every AI-related use case depends on, so nothing else in
    // the container, application, or domain layers needs to change.
    aiProvider: overrides.aiProvider ?? new OpenAiProvider(),
  };

  return {
    dependencies,
    searchJobs: (providerNames) => {
      const providers =
        providerNames && providerNames.length > 0
          ? dependencies.jobProviders.filter((provider) => providerNames.includes(provider.name))
          : dependencies.jobProviders;
      return new SearchJobsUseCase(providers, dependencies.jobRepository);
    },
    saveJob: () => new SaveJobUseCase(dependencies.savedJobRepository, dependencies.jobRepository),
    dismissJob: () =>
      new DismissJobUseCase(dependencies.savedJobRepository, dependencies.jobRepository),
    createApplication: () =>
      new CreateApplicationUseCase(
        dependencies.applicationRepository,
        dependencies.jobRepository,
        dependencies.resumeRepository,
      ),
    updateApplicationStatus: () =>
      new UpdateApplicationStatusUseCase(dependencies.applicationRepository),
    scoreJobMatch: () =>
      new ScoreJobMatchUseCase(
        dependencies.jobRepository,
        dependencies.profileRepository,
        dependencies.resumeRepository,
        dependencies.aiProvider,
      ),
    generateCoverLetter: () =>
      new GenerateCoverLetterUseCase(
        dependencies.jobRepository,
        dependencies.profileRepository,
        dependencies.resumeRepository,
        dependencies.aiProvider,
      ),
    suggestCvImprovements: () =>
      new SuggestCVImprovementsUseCase(
        dependencies.resumeRepository,
        dependencies.jobRepository,
        dependencies.aiProvider,
      ),
  };
}
