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
import { ListApplicationsUseCase } from "@/application/use-cases/list-applications.use-case";
import { ListSavedJobsUseCase } from "@/application/use-cases/list-saved-jobs.use-case";
import { SaveJobUseCase } from "@/application/use-cases/save-job.use-case";
import { ScoreJobMatchUseCase } from "@/application/use-cases/score-job-match.use-case";
import { SearchJobsUseCase } from "@/application/use-cases/search-jobs.use-case";
import { SuggestCVImprovementsUseCase } from "@/application/use-cases/suggest-cv-improvements.use-case";
import { UpdateApplicationStatusUseCase } from "@/application/use-cases/update-application-status.use-case";
import { PrismaClient } from "@/generated/prisma/client";
import { hasAdzunaCredentials } from "@/infrastructure/job-providers/adzuna/adzuna-config";
import { AdzunaJobProvider } from "@/infrastructure/job-providers/adzuna/adzuna-provider";
import { MockJobProvider } from "@/infrastructure/job-providers/mock/mock-job-provider";
import { hasReedCredentials } from "@/infrastructure/job-providers/reed/reed-config";
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
  listSavedJobs(): ListSavedJobsUseCase;
  createApplication(): CreateApplicationUseCase;
  updateApplicationStatus(): UpdateApplicationStatusUseCase;
  listApplications(): ListApplicationsUseCase;
  scoreJobMatch(): ScoreJobMatchUseCase;
  generateCoverLetter(): GenerateCoverLetterUseCase;
  suggestCvImprovements(): SuggestCVImprovementsUseCase;
}

/**
 * Real job providers are wired in individually — a provider missing its
 * credentials is simply excluded rather than causing the whole container
 * to throw (previously, e.g., a missing Reed key broke Adzuna search too).
 * In development only, if that leaves zero configured providers, a fixed
 * set of sample listings is used instead (see mock-job-provider.ts) so the
 * Job Search screen still works without any API keys set up locally.
 * Production never falls back to mock data: with zero configured
 * providers there, search legitimately returns zero results, which is the
 * correct signal that the deployment is misconfigured.
 */
function resolveDefaultJobProviders(): JobProvider[] {
  const configured: JobProvider[] = [];
  if (hasAdzunaCredentials()) configured.push(new AdzunaJobProvider());
  if (hasReedCredentials()) configured.push(new ReedJobProvider());

  if (configured.length === 0 && process.env.NODE_ENV === "development") {
    return [new MockJobProvider()];
  }

  return configured;
}

/** Memoizing thunk: `factory` runs at most once, on first call, and the result is cached. */
function lazy<T>(factory: () => T): () => T {
  let cached: T | undefined;
  let hasValue = false;
  return () => {
    if (!hasValue) {
      cached = factory();
      hasValue = true;
    }
    return cached as T;
  };
}

/**
 * Composition root: the only place that knows both the application ports
 * and their concrete infrastructure implementations.
 *
 * Every dependency (other than the shared Prisma client) is constructed
 * lazily — on first read of the corresponding `dependencies.*` property,
 * not when createContainer() itself runs. This matters most for
 * `aiProvider`: constructing OpenAiProvider validates OPENAI_API_KEY, and
 * eagerly building it meant every route — including GET /api/jobs, which
 * never touches AI — failed if that key was missing. Now a route only pays
 * for (and validates credentials for) the dependencies it actually reads;
 * `container.searchJobs()` never touches `dependencies.aiProvider` at all,
 * while `container.scoreJobMatch()` (and friends) still construct and
 * validate it as an argument, so AI routes fail exactly as before when
 * OPENAI_API_KEY is missing — just later, and only for those routes.
 *
 * Deliberately does NOT instantiate a module-level default container (no
 * `export const container = createContainer()`) — doing so would still let
 * a stray early property read validate credentials no caller asked for.
 * Each call builds its own set of lazy dependencies; the shared Prisma
 * client is the one exception (see below).
 *
 * No other global mutable state is introduced: each lazy() thunk caches
 * only within its own createContainer() call, and every factory method on
 * the returned Container still returns a brand-new use-case instance per
 * call.
 */
export function createContainer(overrides: Partial<ContainerDependencies> = {}): Container {
  const prismaClient = overrides.prisma ?? sharedPrisma;

  const getJobRepository = overrides.jobRepository
    ? () => overrides.jobRepository!
    : lazy(() => new PrismaJobRepository(prismaClient));
  const getSavedJobRepository = overrides.savedJobRepository
    ? () => overrides.savedJobRepository!
    : lazy(() => new PrismaSavedJobRepository(prismaClient));
  const getApplicationRepository = overrides.applicationRepository
    ? () => overrides.applicationRepository!
    : lazy(() => new PrismaApplicationRepository(prismaClient));
  const getResumeRepository = overrides.resumeRepository
    ? () => overrides.resumeRepository!
    : lazy(() => new PrismaResumeRepository(prismaClient));
  const getProfileRepository = overrides.profileRepository
    ? () => overrides.profileRepository!
    : lazy(() => new PrismaProfileRepository(prismaClient));
  // Adding a new job provider is one more entry in
  // resolveDefaultJobProviders() — SearchJobsUseCase already accepts any
  // number of JobProvider implementations.
  const getJobProviders = overrides.jobProviders
    ? () => overrides.jobProviders!
    : lazy(resolveDefaultJobProviders);
  // Swappable: replace or add to this construction to introduce
  // Claude/Anthropic alongside or instead of OpenAI. AiProvider is the
  // only thing every AI-related use case depends on, so nothing else in
  // the container, application, or domain layers needs to change.
  const getAiProvider = overrides.aiProvider
    ? () => overrides.aiProvider!
    : lazy(() => new OpenAiProvider());

  const dependencies: ContainerDependencies = {
    prisma: prismaClient,
    get jobRepository() {
      return getJobRepository();
    },
    get savedJobRepository() {
      return getSavedJobRepository();
    },
    get applicationRepository() {
      return getApplicationRepository();
    },
    get resumeRepository() {
      return getResumeRepository();
    },
    get profileRepository() {
      return getProfileRepository();
    },
    get jobProviders() {
      return getJobProviders();
    },
    get aiProvider() {
      return getAiProvider();
    },
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
    listSavedJobs: () =>
      new ListSavedJobsUseCase(dependencies.savedJobRepository, dependencies.jobRepository),
    createApplication: () =>
      new CreateApplicationUseCase(
        dependencies.applicationRepository,
        dependencies.jobRepository,
        dependencies.resumeRepository,
      ),
    updateApplicationStatus: () =>
      new UpdateApplicationStatusUseCase(dependencies.applicationRepository),
    listApplications: () =>
      new ListApplicationsUseCase(dependencies.applicationRepository, dependencies.jobRepository),
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
