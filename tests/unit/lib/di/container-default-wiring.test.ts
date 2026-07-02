import { afterEach, describe, expect, it, vi } from "vitest";
import { createContainer } from "@/lib/di/container";
import { AdzunaJobProvider } from "@/infrastructure/job-providers/adzuna/adzuna-provider";
import { MockJobProvider } from "@/infrastructure/job-providers/mock/mock-job-provider";
import { ReedJobProvider } from "@/infrastructure/job-providers/reed/reed-provider";
import { OpenAiProvider } from "@/infrastructure/llm/openai/openai-provider";
import { PrismaApplicationRepository } from "@/infrastructure/persistence/prisma/application.repository";
import { PrismaJobRepository } from "@/infrastructure/persistence/prisma/job.repository";

/**
 * Complements container.test.ts's fake-based tests by proving the *actual*
 * default wiring (no overrides) is correct — right classes, right order —
 * using throwaway credentials. Each adapter config is loaded lazily at
 * construction time (see adzuna-config.ts / reed-config.ts / openai-config.ts),
 * so stubbing env vars here (after this file's own imports have already
 * run) is sufficient; no module reset or dynamic re-import is needed.
 *
 * createContainer() itself is also lazy per dependency (see container.ts):
 * it never constructs anything until the corresponding
 * `dependencies.*` property is actually read, so calling it never
 * validates credentials for parts of the app a caller doesn't touch.
 */
describe("createContainer default wiring", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("wires Adzuna, Reed, OpenAI, and Prisma repositories by default when credentials are present", () => {
    vi.stubEnv("ADZUNA_APP_ID", "test-adzuna-id");
    vi.stubEnv("ADZUNA_APP_KEY", "test-adzuna-key");
    vi.stubEnv("REED_API_KEY", "test-reed-key");
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");

    const container = createContainer();

    expect(container.dependencies.jobProviders).toHaveLength(2);
    expect(container.dependencies.jobProviders[0]).toBeInstanceOf(AdzunaJobProvider);
    expect(container.dependencies.jobProviders[1]).toBeInstanceOf(ReedJobProvider);
    expect(container.dependencies.aiProvider).toBeInstanceOf(OpenAiProvider);
    expect(container.dependencies.jobRepository).toBeInstanceOf(PrismaJobRepository);
    expect(container.dependencies.applicationRepository).toBeInstanceOf(
      PrismaApplicationRepository,
    );
  });

  it("excludes Adzuna (rather than throwing) when only its credentials are missing, keeping Reed", () => {
    vi.stubEnv("ADZUNA_APP_ID", "");
    vi.stubEnv("ADZUNA_APP_KEY", "");
    vi.stubEnv("REED_API_KEY", "test-reed-key");
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");

    const container = createContainer();

    expect(container.dependencies.jobProviders).toHaveLength(1);
    expect(container.dependencies.jobProviders[0]).toBeInstanceOf(ReedJobProvider);
  });

  it("does not throw on createContainer() itself when OPENAI_API_KEY is missing", () => {
    vi.stubEnv("ADZUNA_APP_ID", "test-adzuna-id");
    vi.stubEnv("ADZUNA_APP_KEY", "test-adzuna-key");
    vi.stubEnv("REED_API_KEY", "test-reed-key");
    vi.stubEnv("OPENAI_API_KEY", "");

    expect(() => createContainer()).not.toThrow();
  });

  it("throws a clear config error only once dependencies.aiProvider is actually read", () => {
    vi.stubEnv("ADZUNA_APP_ID", "test-adzuna-id");
    vi.stubEnv("ADZUNA_APP_KEY", "test-adzuna-key");
    vi.stubEnv("REED_API_KEY", "test-reed-key");
    vi.stubEnv("OPENAI_API_KEY", "");

    const container = createContainer();

    expect(() => container.dependencies.aiProvider).toThrow(/OPENAI_API_KEY/);
  });

  it("throws when an AI use-case factory (which reads aiProvider) is called with no OpenAI key", () => {
    vi.stubEnv("ADZUNA_APP_ID", "test-adzuna-id");
    vi.stubEnv("ADZUNA_APP_KEY", "test-adzuna-key");
    vi.stubEnv("REED_API_KEY", "test-reed-key");
    vi.stubEnv("OPENAI_API_KEY", "");

    const container = createContainer();

    expect(() => container.scoreJobMatch()).toThrow(/OPENAI_API_KEY/);
    expect(() => container.generateCoverLetter()).toThrow(/OPENAI_API_KEY/);
    expect(() => container.suggestCvImprovements()).toThrow(/OPENAI_API_KEY/);
  });

  it("lets job-only usage (searchJobs) succeed with no OPENAI_API_KEY set at all", () => {
    vi.stubEnv("ADZUNA_APP_ID", "test-adzuna-id");
    vi.stubEnv("ADZUNA_APP_KEY", "test-adzuna-key");
    vi.stubEnv("REED_API_KEY", "test-reed-key");
    vi.stubEnv("OPENAI_API_KEY", "");

    const container = createContainer();

    expect(() => container.searchJobs()).not.toThrow();
    expect(() => container.dependencies.jobProviders).not.toThrow();
    // aiProvider itself was never read, so OpenAiProvider was never constructed.
  });

  it("falls back to MockJobProvider in development when no job provider is configured", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ADZUNA_APP_ID", "");
    vi.stubEnv("ADZUNA_APP_KEY", "");
    vi.stubEnv("REED_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");

    const container = createContainer();

    expect(container.dependencies.jobProviders).toHaveLength(1);
    expect(container.dependencies.jobProviders[0]).toBeInstanceOf(MockJobProvider);
  });

  it("does NOT fall back to MockJobProvider outside development when no job provider is configured", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADZUNA_APP_ID", "");
    vi.stubEnv("ADZUNA_APP_KEY", "");
    vi.stubEnv("REED_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");

    const container = createContainer();

    expect(container.dependencies.jobProviders).toHaveLength(0);
  });

  it("createContainer() never throws even when every credential is missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADZUNA_APP_ID", "");
    vi.stubEnv("ADZUNA_APP_KEY", "");
    vi.stubEnv("REED_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "");

    expect(() => createContainer()).not.toThrow();
  });
});
