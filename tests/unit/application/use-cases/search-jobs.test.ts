import { describe, expect, it } from "vitest";
import { JobProviderListing } from "@/application/dto/job-provider.dto";
import { SearchJobsUseCase } from "@/application/use-cases/search-jobs.use-case";
import { FakeJobProvider } from "../fakes/fake-job-provider";
import { InMemoryJobRepository } from "../fakes/in-memory-job-repository";

const baseListing = (overrides: Partial<JobProviderListing> = {}): JobProviderListing => ({
  provider: "ADZUNA",
  externalId: "ext-1",
  companyId: "c1",
  title: "Staff Engineer",
  description: "Build things.",
  url: "https://example.com/jobs/1",
  location: { city: "London", country: "UK", isRemote: false },
  ...overrides,
});

describe("SearchJobsUseCase", () => {
  it("creates new Job entities from provider listings and persists them", async () => {
    const jobRepository = new InMemoryJobRepository();
    const provider = new FakeJobProvider("ADZUNA", [baseListing()]);
    const useCase = new SearchJobsUseCase([provider], jobRepository);

    const result = await useCase.execute({ keywords: "engineer" });

    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0].title).toBe("Staff Engineer");
    expect(await jobRepository.findByProviderListing("ADZUNA", "ext-1")).not.toBeNull();
  });

  it("merges results from multiple providers", async () => {
    const jobRepository = new InMemoryJobRepository();
    const adzuna = new FakeJobProvider("ADZUNA", [baseListing({ externalId: "a1" })]);
    const reed = new FakeJobProvider("REED", [
      baseListing({ provider: "REED", externalId: "r1", title: "Backend Engineer" }),
    ]);
    const useCase = new SearchJobsUseCase([adzuna, reed], jobRepository);

    const result = await useCase.execute({});

    expect(result.jobs).toHaveLength(2);
  });

  it("re-sights an existing job (bumps lastSeenAt) instead of duplicating it", async () => {
    const jobRepository = new InMemoryJobRepository();
    const provider = new FakeJobProvider("ADZUNA", [baseListing()]);
    const first = new Date("2026-01-01T00:00:00Z");
    const second = new Date("2026-01-02T00:00:00Z");
    let call = 0;
    const clock = () => (call++ === 0 ? first : second);
    const useCase = new SearchJobsUseCase([provider], jobRepository, clock);

    await useCase.execute({});
    const result = await useCase.execute({});

    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0].firstSeenAt).toEqual(first);
    expect(result.jobs[0].lastSeenAt).toEqual(second);
  });

  it("un-expires a job that reappears in a search", async () => {
    const jobRepository = new InMemoryJobRepository();
    const provider = new FakeJobProvider("ADZUNA", [baseListing()]);
    const useCase = new SearchJobsUseCase([provider], jobRepository);
    await useCase.execute({});
    const expired = (await jobRepository.findByProviderListing("ADZUNA", "ext-1"))!.markExpired();
    await jobRepository.save(expired);

    const result = await useCase.execute({});

    expect(result.jobs[0].isExpired).toBe(false);
  });

  it("flags likely cross-provider duplicates via canonicalJobId", async () => {
    const jobRepository = new InMemoryJobRepository();
    const adzuna = new FakeJobProvider("ADZUNA", [
      baseListing({ externalId: "a1", title: "Staff Engineer", companyId: "c1" }),
    ]);
    const reed = new FakeJobProvider("REED", [
      baseListing({ provider: "REED", externalId: "r1", title: "Staff Engineer", companyId: "c1" }),
    ]);
    const useCase = new SearchJobsUseCase([adzuna, reed], jobRepository);

    const result = await useCase.execute({});

    const canonical = result.jobs.find((job) => !job.canonicalJobId);
    const duplicate = result.jobs.find((job) => job.canonicalJobId);

    expect(canonical).toBeDefined();
    expect(duplicate?.canonicalJobId).toBe(canonical?.id);
  });

  it("does not flag jobs at different companies as duplicates", async () => {
    const jobRepository = new InMemoryJobRepository();
    const adzuna = new FakeJobProvider("ADZUNA", [
      baseListing({ externalId: "a1", title: "Staff Engineer", companyId: "c1" }),
    ]);
    const reed = new FakeJobProvider("REED", [
      baseListing({ provider: "REED", externalId: "r1", title: "Staff Engineer", companyId: "c2" }),
    ]);
    const useCase = new SearchJobsUseCase([adzuna, reed], jobRepository);

    const result = await useCase.execute({});

    expect(result.jobs.every((job) => !job.canonicalJobId)).toBe(true);
  });

  it("returns an empty failedProviders list when every provider succeeds", async () => {
    const jobRepository = new InMemoryJobRepository();
    const provider = new FakeJobProvider("ADZUNA", [baseListing()]);
    const useCase = new SearchJobsUseCase([provider], jobRepository);

    const result = await useCase.execute({});

    expect(result.failedProviders).toEqual([]);
  });

  it("still returns the other provider's results when one provider fails", async () => {
    const jobRepository = new InMemoryJobRepository();
    const adzuna = new FakeJobProvider("ADZUNA", [baseListing({ externalId: "a1" })]);
    const reed = new FakeJobProvider("REED", [], new Error("Reed is rate-limiting requests"));
    const useCase = new SearchJobsUseCase([adzuna, reed], jobRepository);

    const result = await useCase.execute({});

    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0].provider).toBe("ADZUNA");
    expect(result.failedProviders).toEqual(["REED"]);
  });

  it("throws the original error when every configured provider fails", async () => {
    const jobRepository = new InMemoryJobRepository();
    const failure = new Error("Adzuna is rate-limiting requests");
    const adzuna = new FakeJobProvider("ADZUNA", [], failure);
    const useCase = new SearchJobsUseCase([adzuna], jobRepository);

    await expect(useCase.execute({})).rejects.toThrow(failure);
  });

  it("throws when all of multiple configured providers fail", async () => {
    const jobRepository = new InMemoryJobRepository();
    const adzuna = new FakeJobProvider("ADZUNA", [], new Error("Adzuna down"));
    const reed = new FakeJobProvider("REED", [], new Error("Reed down"));
    const useCase = new SearchJobsUseCase([adzuna, reed], jobRepository);

    await expect(useCase.execute({})).rejects.toThrow();
  });

  it("does not throw when zero providers are configured (returns an empty result)", async () => {
    const jobRepository = new InMemoryJobRepository();
    const useCase = new SearchJobsUseCase([], jobRepository);

    const result = await useCase.execute({});

    expect(result.jobs).toEqual([]);
    expect(result.failedProviders).toEqual([]);
  });
});
