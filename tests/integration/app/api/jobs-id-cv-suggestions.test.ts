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

const { POST } = await import("@/app/api/jobs/[id]/cv-suggestions/route");

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

function jsonRequest(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/jobs/:id/cv-suggestions", () => {
  it("returns suggestions, using the URL job id as the target job", async () => {
    handles = buildTestContainer();
    seedAll(handles);

    const response = await POST(
      jsonRequest("http://localhost/api/jobs/j1/cv-suggestions", { resumeId: "r1" }),
      { params: Promise.resolve({ id: "j1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.suggestions).toHaveLength(2);
    expect(body.suggestions.map((s: { category: string }) => s.category)).toEqual([
      "WORDING",
      "MISSING_SKILLS",
    ]);
  });

  it("returns 404 when the resume does not exist", async () => {
    handles = buildTestContainer();
    seedAll(handles);

    const response = await POST(
      jsonRequest("http://localhost/api/jobs/j1/cv-suggestions", { resumeId: "missing" }),
      { params: Promise.resolve({ id: "j1" }) },
    );

    expect(response.status).toBe(404);
  });

  it("returns 404 when the target job (URL id) does not exist", async () => {
    handles = buildTestContainer();
    handles.resumeRepository.seed(
      Resume.create({
        id: "r1",
        profileId: "p1",
        label: "General",
        content: "content",
        createdAt: new Date(),
      }),
    );

    const response = await POST(
      jsonRequest("http://localhost/api/jobs/missing/cv-suggestions", { resumeId: "r1" }),
      { params: Promise.resolve({ id: "missing" }) },
    );

    expect(response.status).toBe(404);
  });

  it("returns 400 when neither resumeId nor userId is given", async () => {
    handles = buildTestContainer();
    seedAll(handles);

    const response = await POST(jsonRequest("http://localhost/api/jobs/j1/cv-suggestions", {}), {
      params: Promise.resolve({ id: "j1" }),
    });

    expect(response.status).toBe(400);
  });

  it("resolves a default resume when only userId is given (no resumeId)", async () => {
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

    const response = await POST(
      jsonRequest("http://localhost/api/jobs/j1/cv-suggestions", { userId: "u2" }),
      { params: Promise.resolve({ id: "j1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.suggestions).toHaveLength(2);
  });
});
