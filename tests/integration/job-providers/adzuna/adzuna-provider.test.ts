import { describe, expect, it, vi } from "vitest";
import { AdzunaConfig } from "@/infrastructure/job-providers/adzuna/adzuna-config";
import { AdzunaRequestError } from "@/infrastructure/job-providers/adzuna/adzuna-errors";
import { AdzunaJobProvider } from "@/infrastructure/job-providers/adzuna/adzuna-provider";
import { AdzunaApiResponse } from "@/infrastructure/job-providers/adzuna/adzuna-types";

const config: AdzunaConfig = { appId: "id123", appKey: "key456", country: "gb" };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("AdzunaJobProvider", () => {
  it("exposes its provider name as ADZUNA", () => {
    const provider = new AdzunaJobProvider(config, vi.fn());
    expect(provider.name).toBe("ADZUNA");
  });

  it("maps a successful response into normalized listings", async () => {
    const body: AdzunaApiResponse = {
      results: [
        {
          id: "1",
          title: "Staff Engineer",
          redirect_url: "https://example.com/jobs/1",
          company: { display_name: "Acme Corp" },
          location: { display_name: "London" },
        },
      ],
    };
    const fetchImpl = vi.fn(async () => jsonResponse(body));
    const provider = new AdzunaJobProvider(config, fetchImpl);

    const listings = await provider.search({ keywords: "engineer" });

    expect(listings).toHaveLength(1);
    expect(listings[0].externalId).toBe("1");
    expect(listings[0].provider).toBe("ADZUNA");
  });

  it("returns an empty array when there are no results", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ results: [] }));
    const provider = new AdzunaJobProvider(config, fetchImpl);

    expect(await provider.search({})).toEqual([]);
  });

  it("filters out malformed listings without crashing the whole search", async () => {
    const body: AdzunaApiResponse = {
      results: [
        { id: "1", title: "Valid", redirect_url: "https://example.com/jobs/1" },
        { title: "Missing id", redirect_url: "https://example.com/jobs/2" },
        { id: "3", redirect_url: "https://example.com/jobs/3" },
      ],
    };
    const fetchImpl = vi.fn(async () => jsonResponse(body));
    const provider = new AdzunaJobProvider(config, fetchImpl);

    const listings = await provider.search({});
    expect(listings).toHaveLength(1);
    expect(listings[0].externalId).toBe("1");
  });

  it("includes credentials, country, and search params in the request URL", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL) => jsonResponse({ results: [] }));
    const provider = new AdzunaJobProvider(config, fetchImpl);

    await provider.search({
      keywords: "staff engineer",
      location: "London",
      salaryMin: 60000,
      postedWithinDays: 7,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const requestedUrl = new URL(fetchImpl.mock.calls[0][0] as string);

    expect(requestedUrl.origin + requestedUrl.pathname).toBe(
      "https://api.adzuna.com/v1/api/jobs/gb/search/1",
    );
    expect(requestedUrl.searchParams.get("app_id")).toBe("id123");
    expect(requestedUrl.searchParams.get("app_key")).toBe("key456");
    expect(requestedUrl.searchParams.get("what")).toBe("staff engineer");
    expect(requestedUrl.searchParams.get("where")).toBe("London");
    expect(requestedUrl.searchParams.get("salary_min")).toBe("60000");
    expect(requestedUrl.searchParams.get("max_days_old")).toBe("7");
  });

  it("omits optional search params from the URL when not provided", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL) => jsonResponse({ results: [] }));
    const provider = new AdzunaJobProvider(config, fetchImpl);

    await provider.search({});

    const requestedUrl = new URL(fetchImpl.mock.calls[0][0] as string);
    expect(requestedUrl.searchParams.has("what")).toBe(false);
    expect(requestedUrl.searchParams.has("where")).toBe(false);
    expect(requestedUrl.searchParams.has("salary_min")).toBe(false);
    expect(requestedUrl.searchParams.has("max_days_old")).toBe(false);
  });

  it("throws AdzunaRequestError on a non-OK HTTP response", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: "unauthorized" }, 401));
    const provider = new AdzunaJobProvider(config, fetchImpl);

    await expect(provider.search({})).rejects.toThrow(AdzunaRequestError);
  });

  it("throws AdzunaRequestError when the network request fails", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("network down");
    });
    const provider = new AdzunaJobProvider(config, fetchImpl);

    await expect(provider.search({})).rejects.toThrow(AdzunaRequestError);
  });

  it("throws AdzunaRequestError when the response body isn't valid JSON", async () => {
    const fetchImpl = vi.fn(async () => new Response("not json", { status: 200 }));
    const provider = new AdzunaJobProvider(config, fetchImpl);

    await expect(provider.search({})).rejects.toThrow(AdzunaRequestError);
  });
});
