import { afterEach, describe, expect, it, vi } from "vitest";
import { createContainer } from "@/lib/di/container";
import { AdzunaJobProvider } from "@/infrastructure/job-providers/adzuna/adzuna-provider";
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

  it("throws a clear config error when Adzuna credentials are missing", () => {
    vi.stubEnv("ADZUNA_APP_ID", "");
    vi.stubEnv("ADZUNA_APP_KEY", "");
    vi.stubEnv("REED_API_KEY", "test-reed-key");
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");

    expect(() => createContainer()).toThrow(/ADZUNA_APP_ID/);
  });

  it("throws a clear config error when the OpenAI key is missing", () => {
    vi.stubEnv("ADZUNA_APP_ID", "test-adzuna-id");
    vi.stubEnv("ADZUNA_APP_KEY", "test-adzuna-key");
    vi.stubEnv("REED_API_KEY", "test-reed-key");
    vi.stubEnv("OPENAI_API_KEY", "");

    expect(() => createContainer()).toThrow(/OPENAI_API_KEY/);
  });
});
