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

const { POST } = await import("@/app/api/jobs/[id]/cover-letter/route");

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

describe("POST /api/jobs/:id/cover-letter", () => {
  it("returns generated cover letter content", async () => {
    handles = buildTestContainer();
    seedAll(handles);

    const response = await POST(
      jsonRequest("http://localhost/api/jobs/j1/cover-letter", {
        profileId: "p1",
        resumeId: "r1",
        tone: "ENTHUSIASTIC",
      }),
      { params: Promise.resolve({ id: "j1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.coverLetter.content).toContain("Dear Hiring Manager");
    expect(body.coverLetter.modelVersion).toBe("fake-model-1");
  });

  it("returns 400 for an invalid tone value", async () => {
    handles = buildTestContainer();
    seedAll(handles);

    const response = await POST(
      jsonRequest("http://localhost/api/jobs/j1/cover-letter", {
        profileId: "p1",
        tone: "CASUAL",
      }),
      { params: Promise.resolve({ id: "j1" }) },
    );

    expect(response.status).toBe(400);
  });

  it("returns 404 when the resume does not exist", async () => {
    handles = buildTestContainer();
    seedAll(handles);

    const response = await POST(
      jsonRequest("http://localhost/api/jobs/j1/cover-letter", {
        profileId: "p1",
        resumeId: "missing",
      }),
      { params: Promise.resolve({ id: "j1" }) },
    );

    expect(response.status).toBe(404);
  });
});
