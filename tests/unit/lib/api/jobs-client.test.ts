import { describe, expect, it, vi } from "vitest";
import { JobSearchRequestError, JobSearchResponse, searchJobs } from "@/lib/api/jobs-client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

const emptyResponse: JobSearchResponse = {
  jobs: [],
  totalListingsFound: 0,
  isMock: false,
  configuredProviders: ["ADZUNA", "REED"],
  failedProviders: [],
};

describe("searchJobs", () => {
  it("requests /api/jobs with no query string when no params are given", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL) => jsonResponse(emptyResponse));

    await searchJobs({}, fetchImpl);

    expect(fetchImpl).toHaveBeenCalledWith("/api/jobs");
  });

  it("encodes q, location, salaryMin, remoteOnly, and provider into the query string", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL) => jsonResponse(emptyResponse));

    await searchJobs(
      { q: "engineer", location: "London", salaryMin: 50000, remoteOnly: true, provider: "ADZUNA" },
      fetchImpl,
    );

    const requestedUrl = new URL(fetchImpl.mock.calls[0][0] as string, "http://localhost");
    expect(requestedUrl.pathname).toBe("/api/jobs");
    expect(requestedUrl.searchParams.get("q")).toBe("engineer");
    expect(requestedUrl.searchParams.get("location")).toBe("London");
    expect(requestedUrl.searchParams.get("salaryMin")).toBe("50000");
    expect(requestedUrl.searchParams.get("remoteOnly")).toBe("true");
    expect(requestedUrl.searchParams.get("provider")).toBe("ADZUNA");
  });

  it("omits remoteOnly from the query string when false", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL) => jsonResponse(emptyResponse));

    await searchJobs({ remoteOnly: false }, fetchImpl);

    const requestedUrl = new URL(fetchImpl.mock.calls[0][0] as string, "http://localhost");
    expect(requestedUrl.searchParams.has("remoteOnly")).toBe(false);
  });

  it("returns the parsed response body on success", async () => {
    const body: JobSearchResponse = {
      jobs: [
        {
          id: "j1",
          companyId: "acme",
          provider: "ADZUNA",
          externalId: "1",
          title: "Staff Engineer",
          description: "desc",
          location: { city: "London", region: null, country: "UK", isRemote: false },
          url: "https://example.com/jobs/1",
          salaryRange: { min: 60000, max: 80000, currency: "GBP" },
          employmentType: "FULL_TIME",
          workMode: null,
          postedAt: "2026-01-01T00:00:00.000Z",
          firstSeenAt: "2026-01-01T00:00:00.000Z",
          lastSeenAt: "2026-01-01T00:00:00.000Z",
          isExpired: false,
          canonicalJobId: null,
        },
      ],
      totalListingsFound: 1,
      isMock: false,
      configuredProviders: ["ADZUNA"],
      failedProviders: [],
    };
    const fetchImpl = vi.fn(async () => jsonResponse(body));

    const result = await searchJobs({}, fetchImpl);

    expect(result).toEqual(body);
  });

  it("throws JobSearchRequestError with the API's error message on a non-OK response", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ error: { message: "Validation failed" } }, 400),
    );

    await expect(searchJobs({}, fetchImpl)).rejects.toThrow(JobSearchRequestError);
    await expect(searchJobs({}, fetchImpl)).rejects.toThrow("Validation failed");
  });

  it("falls back to a generic message when the error body isn't JSON", async () => {
    const fetchImpl = vi.fn(async () => new Response("not json", { status: 500 }));

    await expect(searchJobs({}, fetchImpl)).rejects.toThrow(/status 500/);
  });
});
