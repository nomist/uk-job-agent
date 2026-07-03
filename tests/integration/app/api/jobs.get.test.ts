import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { buildTestContainer, TestContainerHandles } from "./support/build-test-container";
import { FakeJobProvider } from "../../../unit/application/fakes/fake-job-provider";

let handles: TestContainerHandles;

vi.mock("@/lib/di/get-container", () => ({
  getContainer: () => handles.container,
}));

const { GET } = await import("@/app/api/jobs/route");

describe("GET /api/jobs", () => {
  it("returns mapped listings from the configured providers", async () => {
    handles = buildTestContainer({
      jobProviders: [
        new FakeJobProvider("ADZUNA", [
          {
            provider: "ADZUNA",
            externalId: "1",
            companyId: "c1",
            title: "Staff Engineer",
            description: "desc",
            url: "https://example.com/jobs/1",
            location: { city: "London", country: "UK", isRemote: false },
          },
        ]),
      ],
    });

    const response = await GET(new NextRequest("http://localhost/api/jobs?q=engineer"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.jobs).toHaveLength(1);
    expect(body.jobs[0].title).toBe("Staff Engineer");
    expect(body.jobs[0].location.city).toBe("London");
    expect(body.totalListingsFound).toBe(1);
  });

  it("filters to remote-only jobs when remoteOnly=true", async () => {
    handles = buildTestContainer({
      jobProviders: [
        new FakeJobProvider("ADZUNA", [
          {
            provider: "ADZUNA",
            externalId: "1",
            companyId: "c1",
            title: "Onsite Role",
            description: "d",
            url: "https://example.com/jobs/1",
            location: { country: "UK", isRemote: false },
          },
          {
            provider: "ADZUNA",
            externalId: "2",
            companyId: "c1",
            title: "Remote Role",
            description: "d",
            url: "https://example.com/jobs/2",
            location: { country: "UK", isRemote: true },
          },
        ]),
      ],
    });

    const response = await GET(new NextRequest("http://localhost/api/jobs?remoteOnly=true"));
    const body = await response.json();

    expect(body.jobs).toHaveLength(1);
    expect(body.jobs[0].title).toBe("Remote Role");
  });

  it("filters to a single provider when the provider query param is given", async () => {
    handles = buildTestContainer({
      jobProviders: [
        new FakeJobProvider("ADZUNA", [
          {
            provider: "ADZUNA",
            externalId: "1",
            companyId: "c1",
            title: "From Adzuna",
            description: "d",
            url: "https://example.com/jobs/1",
            location: { country: "UK", isRemote: true },
          },
        ]),
        new FakeJobProvider("REED", [
          {
            provider: "REED",
            externalId: "2",
            companyId: "c1",
            title: "From Reed",
            description: "d",
            url: "https://example.com/jobs/2",
            location: { country: "UK", isRemote: true },
          },
        ]),
      ],
    });

    const response = await GET(new NextRequest("http://localhost/api/jobs?provider=reed"));
    const body = await response.json();

    expect(body.jobs).toHaveLength(1);
    expect(body.jobs[0].title).toBe("From Reed");
  });

  it("returns an empty list when no providers are configured to return anything", async () => {
    handles = buildTestContainer();
    const response = await GET(new NextRequest("http://localhost/api/jobs"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.jobs).toEqual([]);
  });

  it("returns 400 for an invalid salaryMin", async () => {
    handles = buildTestContainer();
    const response = await GET(new NextRequest("http://localhost/api/jobs?salaryMin=not-a-number"));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.message).toBeDefined();
  });

  it("reports isMock: false when the wired providers are real (non-MOCK) providers", async () => {
    handles = buildTestContainer({
      jobProviders: [new FakeJobProvider("ADZUNA", [])],
    });

    const response = await GET(new NextRequest("http://localhost/api/jobs"));
    const body = await response.json();

    expect(body.isMock).toBe(false);
  });

  it("reports isMock: true when the wired provider is named MOCK", async () => {
    handles = buildTestContainer({
      jobProviders: [
        new FakeJobProvider("MOCK", [
          {
            provider: "MOCK",
            externalId: "mock-1",
            companyId: "sample co",
            title: "Sample Engineer",
            description: "desc",
            url: "https://example.com/mock-jobs/1",
            location: { country: "UK", isRemote: true },
          },
        ]),
      ],
    });

    const response = await GET(new NextRequest("http://localhost/api/jobs"));
    const body = await response.json();

    expect(body.isMock).toBe(true);
    expect(body.jobs).toHaveLength(1);
  });

  it("reports isMock: false when zero providers are configured (not the same as mock)", async () => {
    handles = buildTestContainer({ jobProviders: [] });

    const response = await GET(new NextRequest("http://localhost/api/jobs"));
    const body = await response.json();

    expect(body.isMock).toBe(false);
    expect(body.jobs).toEqual([]);
  });

  it("reports configuredProviders as empty when zero providers are wired", async () => {
    handles = buildTestContainer({ jobProviders: [] });

    const response = await GET(new NextRequest("http://localhost/api/jobs"));
    const body = await response.json();

    expect(body.configuredProviders).toEqual([]);
  });

  it("reports every wired provider's name in configuredProviders, regardless of the ?provider= filter", async () => {
    handles = buildTestContainer({
      jobProviders: [new FakeJobProvider("ADZUNA", []), new FakeJobProvider("REED", [])],
    });

    const response = await GET(new NextRequest("http://localhost/api/jobs?provider=adzuna"));
    const body = await response.json();

    expect(body.configuredProviders.sort()).toEqual(["ADZUNA", "REED"]);
  });

  it("reports failedProviders and still returns the other provider's results when one provider errors", async () => {
    handles = buildTestContainer({
      jobProviders: [
        new FakeJobProvider("ADZUNA", [
          {
            provider: "ADZUNA",
            externalId: "1",
            companyId: "c1",
            title: "From Adzuna",
            description: "d",
            url: "https://example.com/jobs/1",
            location: { country: "UK", isRemote: true },
          },
        ]),
        new FakeJobProvider("REED", [], new Error("Reed is rate-limiting requests")),
      ],
    });

    const response = await GET(new NextRequest("http://localhost/api/jobs"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.jobs).toHaveLength(1);
    expect(body.jobs[0].title).toBe("From Adzuna");
    expect(body.failedProviders).toEqual(["REED"]);
  });

  it("returns 502 when every configured provider fails", async () => {
    const upstreamError = new Error("Adzuna responded with 500 Internal Server Error");
    upstreamError.name = "AdzunaRequestError";
    handles = buildTestContainer({
      jobProviders: [new FakeJobProvider("ADZUNA", [], upstreamError)],
    });

    const response = await GET(new NextRequest("http://localhost/api/jobs"));

    expect(response.status).toBe(502);
  });
});
