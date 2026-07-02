import { describe, expect, it, vi } from "vitest";
import {
  ApplicationsRequestError,
  createApplication,
  listApplications,
  updateApplicationStatus,
  type ApplicationJson,
  type ListApplicationsResponse,
} from "@/lib/api/applications-client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("listApplications", () => {
  it("requests /api/applications with the userId in the query string", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL) =>
      jsonResponse({ applications: [] }),
    );

    await listApplications("u1", fetchImpl);

    const requestedUrl = new URL(fetchImpl.mock.calls[0][0] as string, "http://localhost");
    expect(requestedUrl.pathname).toBe("/api/applications");
    expect(requestedUrl.searchParams.get("userId")).toBe("u1");
  });

  it("returns the parsed response body on success", async () => {
    const body: ListApplicationsResponse = {
      applications: [
        {
          application: {
            id: "a1",
            userId: "u1",
            jobId: "j1",
            resumeId: "r1",
            status: "APPLIED",
            appliedAt: "2026-01-01T00:00:00.000Z",
            notes: null,
            statusHistory: [],
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
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL) => jsonResponse(body));

    const result = await listApplications("u1", fetchImpl);

    expect(result).toEqual(body);
  });

  it("throws ApplicationsRequestError with the API's error message on a non-OK response", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL) =>
      jsonResponse({ error: { message: "Validation failed" } }, 400),
    );

    await expect(listApplications("u1", fetchImpl)).rejects.toThrow(ApplicationsRequestError);
    await expect(listApplications("u1", fetchImpl)).rejects.toThrow("Validation failed");
  });
});

describe("createApplication", () => {
  it("POSTs to /api/applications with jobId and userId, omitting resumeId", async () => {
    const application: ApplicationJson = {
      id: "a1",
      userId: "u1",
      jobId: "job-42",
      resumeId: "default-resume",
      status: "APPLIED",
      appliedAt: "2026-01-01T00:00:00.000Z",
      notes: null,
      statusHistory: [],
    };
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ application }),
    );

    const result = await createApplication("job-42", "u1", fetchImpl);

    expect(fetchImpl).toHaveBeenCalledWith("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: "job-42", userId: "u1" }),
    });
    expect(result).toEqual(application);
  });

  it("throws ApplicationsRequestError on a non-OK response (e.g. duplicate active application)", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ error: { message: "already has an active application" } }, 409),
    );

    await expect(createApplication("job-42", "u1", fetchImpl)).rejects.toThrow(
      ApplicationsRequestError,
    );
    await expect(createApplication("job-42", "u1", fetchImpl)).rejects.toThrow(
      "already has an active application",
    );
  });
});

describe("updateApplicationStatus", () => {
  it("PATCHes /api/applications/:id/status with the new status", async () => {
    const application: ApplicationJson = {
      id: "a1",
      userId: "u1",
      jobId: "j1",
      resumeId: "r1",
      status: "HR_SCREEN",
      appliedAt: "2026-01-01T00:00:00.000Z",
      notes: null,
      statusHistory: [],
    };
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ application }),
    );

    const result = await updateApplicationStatus("a1", "HR_SCREEN", fetchImpl);

    expect(fetchImpl).toHaveBeenCalledWith("/api/applications/a1/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "HR_SCREEN" }),
    });
    expect(result).toEqual(application);
  });

  it("throws ApplicationsRequestError with the API's error message for an invalid transition", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ error: { message: "Cannot transition from OFFER to SAVED" } }, 409),
    );

    await expect(updateApplicationStatus("a1", "SAVED", fetchImpl)).rejects.toThrow(
      "Cannot transition from OFFER to SAVED",
    );
  });
});
