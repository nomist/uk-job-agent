import { describe, expect, it, vi } from "vitest";
import {
  createResume,
  listResumes,
  ResumesRequestError,
  setPrimaryResume,
  type ResumeJson,
} from "@/lib/api/resumes-client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("listResumes", () => {
  it("requests /api/resumes with the current user id in the query string", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL) => jsonResponse({ resumes: [] }));

    await listResumes(fetchImpl);

    const requestedUrl = new URL(fetchImpl.mock.calls[0][0] as string, "http://localhost");
    expect(requestedUrl.pathname).toBe("/api/resumes");
    expect(requestedUrl.searchParams.get("userId")).toBe("local-dev-user");
  });

  it("throws ResumesRequestError on a non-OK response", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL) =>
      jsonResponse({ error: { message: "Validation failed" } }, 400),
    );

    await expect(listResumes(fetchImpl)).rejects.toThrow(ResumesRequestError);
  });
});

describe("createResume", () => {
  it("POSTs to /api/resumes with label, content, and the current user id", async () => {
    const resume: ResumeJson = {
      id: "r1",
      profileId: "p1",
      label: "General",
      content: "My resume content",
      parsedSkills: [],
      isPrimary: true,
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ resume }),
    );

    const result = await createResume("General", "My resume content", fetchImpl);

    expect(fetchImpl).toHaveBeenCalledWith("/api/resumes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "local-dev-user",
        label: "General",
        content: "My resume content",
      }),
    });
    expect(result).toEqual(resume);
  });

  it("throws ResumesRequestError on a non-OK response", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ error: { message: "Validation failed" } }, 400),
    );

    await expect(createResume("", "", fetchImpl)).rejects.toThrow(ResumesRequestError);
  });
});

describe("setPrimaryResume", () => {
  it("PATCHes /api/resumes/:id/primary", async () => {
    const resume: ResumeJson = {
      id: "r1",
      profileId: "p1",
      label: "General",
      content: "content",
      parsedSkills: [],
      isPrimary: true,
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ resume }),
    );

    const result = await setPrimaryResume("r1", fetchImpl);

    expect(fetchImpl).toHaveBeenCalledWith("/api/resumes/r1/primary", { method: "PATCH" });
    expect(result).toEqual(resume);
  });

  it("throws ResumesRequestError with the API's error message on a non-OK response", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ error: { message: "Resume not found" } }, 404),
    );

    await expect(setPrimaryResume("missing", fetchImpl)).rejects.toThrow("Resume not found");
  });
});
