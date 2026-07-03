import { describe, expect, it, vi } from "vitest";
import {
  getProfile,
  ProfileRequestError,
  saveProfile,
  type ProfileJson,
} from "@/lib/api/profile-client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("getProfile", () => {
  it("requests /api/profile with the current user id in the query string", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL) => jsonResponse({ profile: null }));

    await getProfile(fetchImpl);

    const requestedUrl = new URL(fetchImpl.mock.calls[0][0] as string, "http://localhost");
    expect(requestedUrl.pathname).toBe("/api/profile");
    expect(requestedUrl.searchParams.get("userId")).toBe("local-dev-user");
  });

  it("returns null when the user has no profile yet", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL) => jsonResponse({ profile: null }));

    expect(await getProfile(fetchImpl)).toBeNull();
  });

  it("returns the parsed profile on success", async () => {
    const profile: ProfileJson = {
      id: "p1",
      userId: "local-dev-user",
      headline: "Staff Engineer",
      yearsOfExperience: 10,
      skills: ["TypeScript"],
      preferredLocations: ["London"],
      workPreferences: ["REMOTE"],
      visaStatus: "UNKNOWN",
      salaryExpectation: null,
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL) => jsonResponse({ profile }));

    expect(await getProfile(fetchImpl)).toEqual(profile);
  });

  it("throws ProfileRequestError with the API's error message on a non-OK response", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL) =>
      jsonResponse({ error: { message: "Validation failed" } }, 400),
    );

    await expect(getProfile(fetchImpl)).rejects.toThrow(ProfileRequestError);
    await expect(getProfile(fetchImpl)).rejects.toThrow("Validation failed");
  });
});

describe("saveProfile", () => {
  it("PUTs to /api/profile with the current user id merged into the body", async () => {
    const profile: ProfileJson = {
      id: "p1",
      userId: "local-dev-user",
      headline: "Senior Engineer",
      yearsOfExperience: null,
      skills: [],
      preferredLocations: [],
      workPreferences: [],
      visaStatus: "UNKNOWN",
      salaryExpectation: null,
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ profile }),
    );

    const result = await saveProfile({ headline: "Senior Engineer" }, fetchImpl);

    expect(fetchImpl).toHaveBeenCalledWith("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "local-dev-user", headline: "Senior Engineer" }),
    });
    expect(result).toEqual(profile);
  });

  it("throws ProfileRequestError on a non-OK response", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ error: { message: "Invalid years of experience" } }, 400),
    );

    await expect(saveProfile({ yearsOfExperience: -1 }, fetchImpl)).rejects.toThrow(
      "Invalid years of experience",
    );
  });
});
