import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { Job } from "@/domain/entities/job";
import { Profile } from "@/domain/entities/profile";
import { Resume } from "@/domain/entities/resume";
import { Location } from "@/domain/value-objects/location";
import { buildTestContainer, TestContainerHandles } from "./support/build-test-container";

let handles: TestContainerHandles;

vi.mock("@/lib/di/get-container", () => ({
  getContainer: () => handles.container,
}));

const { POST } = await import("@/app/api/jobs/[id]/score/route");

function seedAll(target: TestContainerHandles) {
  target.jobRepository.seed(
    Job.create({
      id: "j1",
      companyId: "c1",
      provider: "ADZUNA",
      externalId: "j1",
      title: "Staff Engineer",
      description: "desc",
      url: "https://example.com/jobs/1",
      location: Location.create({ country: "UK", isRemote: true }),
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
    }),
  );
  target.profileRepository.seed(Profile.create({ id: "p1", userId: "u1", updatedAt: new Date() }));
  target.resumeRepository.seed(
    Resume.create({
      id: "r1",
      profileId: "p1",
      label: "General",
      content: "content",
      isPrimary: true,
      createdAt: new Date(),
    }),
  );
}

function jsonRequest(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/jobs/:id/score", () => {
  it("returns a match score built from the fake AI provider's response", async () => {
    handles = buildTestContainer();
    seedAll(handles);

    const response = await POST(
      jsonRequest("http://localhost/api/jobs/j1/score", { profileId: "p1", resumeId: "r1" }),
      { params: Promise.resolve({ id: "j1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.matchScore.score).toBe(80);
    expect(body.matchScore.confidence.band).toBe("HIGH");
    expect(body.matchScore.jobId).toBe("j1");
  });

  it("falls back to the profile's primary resume when resumeId is omitted", async () => {
    handles = buildTestContainer();
    seedAll(handles);

    const response = await POST(
      jsonRequest("http://localhost/api/jobs/j1/score", { profileId: "p1" }),
      { params: Promise.resolve({ id: "j1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.matchScore.resumeId).toBe("r1");
  });

  it("returns 404 when the job does not exist", async () => {
    handles = buildTestContainer();
    seedAll(handles);

    const response = await POST(
      jsonRequest("http://localhost/api/jobs/missing/score", { profileId: "p1", resumeId: "r1" }),
      { params: Promise.resolve({ id: "missing" }) },
    );

    expect(response.status).toBe(404);
  });

  it("returns 404 when the profile does not exist", async () => {
    handles = buildTestContainer();
    seedAll(handles);

    const response = await POST(
      jsonRequest("http://localhost/api/jobs/j1/score", { profileId: "missing", resumeId: "r1" }),
      { params: Promise.resolve({ id: "j1" }) },
    );

    expect(response.status).toBe(404);
  });

  it("returns 400 when neither profileId nor userId is given", async () => {
    handles = buildTestContainer();
    seedAll(handles);

    const response = await POST(jsonRequest("http://localhost/api/jobs/j1/score", {}), {
      params: Promise.resolve({ id: "j1" }),
    });

    expect(response.status).toBe(400);
  });

  it("resolves a default profile and resume when only userId is given (no profileId)", async () => {
    handles = buildTestContainer();
    handles.jobRepository.seed(
      Job.create({
        id: "j1",
        companyId: "c1",
        provider: "ADZUNA",
        externalId: "j1",
        title: "Staff Engineer",
        description: "desc",
        url: "https://example.com/jobs/1",
        location: Location.create({ country: "UK", isRemote: true }),
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      }),
    );
    // No profile or resume seeded for u2 — the route must resolve defaults itself.

    const response = await POST(
      jsonRequest("http://localhost/api/jobs/j1/score", { userId: "u2" }),
      { params: Promise.resolve({ id: "j1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.matchScore.profileId).not.toBeNull();
    expect(body.matchScore.resumeId).not.toBeNull();
  });
});
