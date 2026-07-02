import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { Job } from "@/domain/entities/job";
import { Resume } from "@/domain/entities/resume";
import { Location } from "@/domain/value-objects/location";
import { buildTestContainer, TestContainerHandles } from "./support/build-test-container";

let handles: TestContainerHandles;

vi.mock("@/lib/di/get-container", () => ({
  getContainer: () => handles.container,
}));

const { POST } = await import("@/app/api/applications/route");

function seedJobAndResume(target: TestContainerHandles) {
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
  target.resumeRepository.seed(
    Resume.create({
      id: "r1",
      profileId: "p1",
      label: "General",
      content: "content",
      createdAt: new Date(),
    }),
  );
}

function jsonRequest(body: unknown) {
  return new NextRequest("http://localhost/api/applications", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/applications", () => {
  it("creates an application", async () => {
    handles = buildTestContainer();
    seedJobAndResume(handles);

    const response = await POST(jsonRequest({ userId: "u1", jobId: "j1", resumeId: "r1" }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.application.status).toBe("APPLIED");
    expect(body.application.jobId).toBe("j1");
  });

  it("returns 404 when the job does not exist", async () => {
    handles = buildTestContainer();
    seedJobAndResume(handles);

    const response = await POST(jsonRequest({ userId: "u1", jobId: "missing", resumeId: "r1" }));

    expect(response.status).toBe(404);
  });

  it("returns 404 when the resume does not exist", async () => {
    handles = buildTestContainer();
    seedJobAndResume(handles);

    const response = await POST(jsonRequest({ userId: "u1", jobId: "j1", resumeId: "missing" }));

    expect(response.status).toBe(404);
  });

  it("returns 409 when an active application already exists for the same job", async () => {
    handles = buildTestContainer();
    seedJobAndResume(handles);
    await POST(jsonRequest({ userId: "u1", jobId: "j1", resumeId: "r1" }));

    const response = await POST(jsonRequest({ userId: "u1", jobId: "j1", resumeId: "r1" }));

    expect(response.status).toBe(409);
  });

  it("returns 400 when required fields are missing", async () => {
    handles = buildTestContainer();

    const response = await POST(jsonRequest({ userId: "u1" }));

    expect(response.status).toBe(400);
  });

  it("returns 400 for a malformed JSON body", async () => {
    handles = buildTestContainer();

    const response = await POST(
      new NextRequest("http://localhost/api/applications", {
        method: "POST",
        body: "not json",
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(response.status).toBe(400);
  });
});
