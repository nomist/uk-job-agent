import { describe, expect, it, vi } from "vitest";
import { ReedConfig } from "@/infrastructure/job-providers/reed/reed-config";
import {
  ReedRateLimitError,
  ReedRequestError,
} from "@/infrastructure/job-providers/reed/reed-errors";
import { ReedJobProvider } from "@/infrastructure/job-providers/reed/reed-provider";
import { ReedSearchResponse } from "@/infrastructure/job-providers/reed/reed-types";

const config: ReedConfig = { apiKey: "key123" };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function formatUkDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

describe("ReedJobProvider", () => {
  it("exposes its provider name as REED", () => {
    const provider = new ReedJobProvider(config, vi.fn());
    expect(provider.name).toBe("REED");
  });

  it("maps a successful response into normalized listings", async () => {
    const body: ReedSearchResponse = {
      results: [
        {
          jobId: 1,
          jobTitle: "Staff Engineer",
          jobUrl: "https://example.com/jobs/1",
          employerName: "Acme",
        },
      ],
    };
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse(body),
    );
    const provider = new ReedJobProvider(config, fetchImpl);

    const listings = await provider.search({ keywords: "engineer" });

    expect(listings).toHaveLength(1);
    expect(listings[0].externalId).toBe("1");
    expect(listings[0].provider).toBe("REED");
  });

  it("returns an empty array when there are no results", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ results: [] }),
    );
    const provider = new ReedJobProvider(config, fetchImpl);

    expect(await provider.search({})).toEqual([]);
  });

  it("filters out malformed listings without crashing the whole search", async () => {
    const body: ReedSearchResponse = {
      results: [
        { jobId: 1, jobTitle: "Valid", jobUrl: "https://example.com/jobs/1" },
        { jobTitle: "Missing id", jobUrl: "https://example.com/jobs/2" },
        { jobId: 3, jobUrl: "https://example.com/jobs/3" },
      ],
    };
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse(body),
    );
    const provider = new ReedJobProvider(config, fetchImpl);

    const listings = await provider.search({});
    expect(listings).toHaveLength(1);
    expect(listings[0].externalId).toBe("1");
  });

  it("sends a Basic Auth header built from the API key with no password", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ results: [] }),
    );
    const provider = new ReedJobProvider(config, fetchImpl);

    await provider.search({});

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const init = fetchImpl.mock.calls[0][1];
    const headers = init?.headers as Record<string, string>;
    const expectedToken = Buffer.from("key123:").toString("base64");
    expect(headers.Authorization).toBe(`Basic ${expectedToken}`);
  });

  it("includes search params in the request URL", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ results: [] }),
    );
    const provider = new ReedJobProvider(config, fetchImpl);

    await provider.search({ keywords: "staff engineer", location: "London", salaryMin: 60000 });

    const requestedUrl = new URL(fetchImpl.mock.calls[0][0] as string);
    expect(requestedUrl.origin + requestedUrl.pathname).toBe(
      "https://www.reed.co.uk/api/1.0/search",
    );
    expect(requestedUrl.searchParams.get("keywords")).toBe("staff engineer");
    expect(requestedUrl.searchParams.get("locationName")).toBe("London");
    expect(requestedUrl.searchParams.get("minimumSalary")).toBe("60000");
  });

  it("omits optional search params from the URL when not provided", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ results: [] }),
    );
    const provider = new ReedJobProvider(config, fetchImpl);

    await provider.search({});

    const requestedUrl = new URL(fetchImpl.mock.calls[0][0] as string);
    expect(requestedUrl.searchParams.has("keywords")).toBe(false);
    expect(requestedUrl.searchParams.has("locationName")).toBe(false);
    expect(requestedUrl.searchParams.has("minimumSalary")).toBe(false);
  });

  it("filters results client-side by postedWithinDays since Reed's API has no such param", async () => {
    const recentDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const body: ReedSearchResponse = {
      results: [
        {
          jobId: 1,
          jobTitle: "Recent",
          jobUrl: "https://example.com/1",
          date: formatUkDate(recentDate),
        },
        { jobId: 2, jobTitle: "Old", jobUrl: "https://example.com/2", date: formatUkDate(oldDate) },
        { jobId: 3, jobTitle: "No date", jobUrl: "https://example.com/3" },
      ],
    };
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse(body),
    );
    const provider = new ReedJobProvider(config, fetchImpl);

    const listings = await provider.search({ postedWithinDays: 7 });

    const ids = listings.map((listing) => listing.externalId).sort();
    // "Old" (30 days ago) is filtered out; "Recent" and the undated one both survive.
    expect(ids).toEqual(["1", "3"]);
  });

  it("does not filter by date when postedWithinDays is omitted", async () => {
    const veryOldDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const body: ReedSearchResponse = {
      results: [
        {
          jobId: 1,
          jobTitle: "Very old",
          jobUrl: "https://example.com/1",
          date: formatUkDate(veryOldDate),
        },
      ],
    };
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse(body),
    );
    const provider = new ReedJobProvider(config, fetchImpl);

    const listings = await provider.search({});
    expect(listings).toHaveLength(1);
  });

  it("throws ReedRequestError on a non-OK HTTP response", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ error: "unauthorized" }, 401),
    );
    const provider = new ReedJobProvider(config, fetchImpl);

    await expect(provider.search({})).rejects.toThrow(ReedRequestError);
  });

  it("throws ReedRequestError when the network request fails", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      throw new Error("network down");
    });
    const provider = new ReedJobProvider(config, fetchImpl);

    await expect(provider.search({})).rejects.toThrow(ReedRequestError);
  });

  it("throws ReedRequestError when the response body isn't valid JSON", async () => {
    const fetchImpl = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response("not json", { status: 200 }),
    );
    const provider = new ReedJobProvider(config, fetchImpl);

    await expect(provider.search({})).rejects.toThrow(ReedRequestError);
  });

  it("throws ReedRateLimitError with retryAfterSeconds on a 429 response", async () => {
    const fetchImpl = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(JSON.stringify({ error: "rate limited" }), {
          status: 429,
          headers: { "Retry-After": "45" },
        }),
    );
    const provider = new ReedJobProvider(config, fetchImpl);

    const error = await provider.search({}).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ReedRateLimitError);
    expect((error as ReedRateLimitError).retryAfterSeconds).toBe(45);
  });

  it("leaves retryAfterSeconds undefined when Reed doesn't send a Retry-After header", async () => {
    const fetchImpl = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(JSON.stringify({ error: "rate limited" }), { status: 429 }),
    );
    const provider = new ReedJobProvider(config, fetchImpl);

    const error = await provider.search({}).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ReedRateLimitError);
    expect((error as ReedRateLimitError).retryAfterSeconds).toBeUndefined();
  });
});
