import { describe, expect, it, vi } from "vitest";
import {
  listSavedJobs,
  saveJob,
  SavedJobsRequestError,
  type ListSavedJobsResponse,
  type SavedJobRecordJson,
} from "@/lib/api/saved-jobs-client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("listSavedJobs", () => {
  it("requests /api/saved-jobs with the userId in the query string", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL) => jsonResponse({ savedJobs: [] }));

    await listSavedJobs("u1", fetchImpl);

    const requestedUrl = new URL(fetchImpl.mock.calls[0][0] as string, "http://localhost");
    expect(requestedUrl.pathname).toBe("/api/saved-jobs");
    expect(requestedUrl.searchParams.get("userId")).toBe("u1");
  });

  it("returns the parsed response body on success", async () => {
    const body: ListSavedJobsResponse = {
      savedJobs: [
        {
          savedJob: {
            id: "sj1",
            userId: "u1",
            jobId: "j1",
            status: "SAVED",
            savedAt: "2026-01-01T00:00:00.000Z",
            notes: null,
          },
          job: {
            id: "j1",
            companyId: "acme",
            provider: "ADZUNA",
            externalId: "1",
            title: "Staff Engineer",
            description: "desc",
            location: { city: "London", region: null, country: "UK", isRemote: false },
            url: "https://example.com/jobs/1",
            salaryRange: null,
            employmentType: null,
            workMode: null,
            postedAt: null,
            firstSeenAt: "2026-01-01T00:00:00.000Z",
            lastSeenAt: "2026-01-01T00:00:00.000Z",
            isExpired: false,
            canonicalJobId: null,
          },
        },
      ],
    };
    const fetchImpl = vi.fn(async () => jsonResponse(body));

    const result = await listSavedJobs("u1", fetchImpl);

    expect(result).toEqual(body);
  });

  it("throws SavedJobsRequestError with the API's error message on a non-OK response", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ error: { message: "Validation failed" } }, 400),
    );

    await expect(listSavedJobs("u1", fetchImpl)).rejects.toThrow(SavedJobsRequestError);
    await expect(listSavedJobs("u1", fetchImpl)).rejects.toThrow("Validation failed");
  });

  it("falls back to a generic message when the error body isn't JSON", async () => {
    const fetchImpl = vi.fn(async () => new Response("not json", { status: 500 }));

    await expect(listSavedJobs("u1", fetchImpl)).rejects.toThrow(/status 500/);
  });
});

describe("saveJob", () => {
  it("POSTs to /api/jobs/:id/save with the userId in the JSON body", async () => {
    const savedJob: SavedJobRecordJson = {
      id: "sj1",
      userId: "u1",
      jobId: "job-42",
      status: "SAVED",
      savedAt: "2026-01-01T00:00:00.000Z",
      notes: null,
    };
    const fetchImpl = vi.fn(async () => jsonResponse({ savedJob }));

    const result = await saveJob("job-42", "u1", fetchImpl);

    expect(fetchImpl).toHaveBeenCalledWith("/api/jobs/job-42/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "u1" }),
    });
    expect(result).toEqual(savedJob);
  });

  it("URL-encodes the job id", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({
        savedJob: {
          id: "sj1",
          userId: "u1",
          jobId: "job/42",
          status: "SAVED",
          savedAt: "2026-01-01T00:00:00.000Z",
          notes: null,
        },
      }),
    );

    await saveJob("job/42", "u1", fetchImpl);

    expect(fetchImpl.mock.calls[0][0]).toBe("/api/jobs/job%2F42/save");
  });

  it("throws SavedJobsRequestError with the API's error message on a non-OK response", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: { message: "Job not found" } }, 404));

    await expect(saveJob("missing", "u1", fetchImpl)).rejects.toThrow(SavedJobsRequestError);
    await expect(saveJob("missing", "u1", fetchImpl)).rejects.toThrow("Job not found");
  });
});
