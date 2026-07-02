import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { Application } from "@/domain/entities/application";
import { Job } from "@/domain/entities/job";
import { Location } from "@/domain/value-objects/location";
import { buildTestContainer, TestContainerHandles } from "./support/build-test-container";

let handles: TestContainerHandles;

vi.mock("@/lib/di/get-container", () => ({
  getContainer: () => handles.container,
}));

const { GET } = await import("@/app/api/applications/route");

function buildJob(overrides: Partial<Parameters<typeof Job.create>[0]> = {}) {
  return Job.create({
    id: randomUUID(),
    companyId: "c1",
    provider: "ADZUNA",
    externalId: randomUUID(),
    title: "Staff Engineer",
    description: "desc",
    url: "https://example.com/jobs/1",
    location: Location.create({ city: "London", country: "UK", isRemote: false }),
    firstSeenAt: new Date(),
    lastSeenAt: new Date(),
    ...overrides,
  });
}

describe("GET /api/applications", () => {
  it("returns 400 when userId is missing", async () => {
    handles = buildTestContainer();

    const response = await GET(new NextRequest("http://localhost/api/applications"));

    expect(response.status).toBe(400);
  });

  it("returns an empty list when the user has no applications", async () => {
    handles = buildTestContainer();

    const response = await GET(new NextRequest("http://localhost/api/applications?userId=u1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.applications).toEqual([]);
  });

  it("returns applications of every status, enriched with job details", async () => {
    handles = buildTestContainer();
    const jobA = buildJob({ title: "Backend Engineer" });
    const jobB = buildJob({ title: "Frontend Engineer" });
    handles.jobRepository.seed(jobA);
    handles.jobRepository.seed(jobB);
    await handles.applicationRepository.save(
      Application.create({
        id: "a1",
        userId: "u1",
        jobId: jobA.id,
        appliedAt: new Date("2026-01-01T00:00:00Z"),
      }),
    );
    await handles.applicationRepository.save(
      Application.create({
        id: "a2",
        userId: "u1",
        jobId: jobB.id,
        appliedAt: new Date("2026-02-01T00:00:00Z"),
      }).transitionTo("REJECTED", new Date("2026-02-02T00:00:00Z")),
    );

    const response = await GET(new NextRequest("http://localhost/api/applications?userId=u1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.applications).toHaveLength(2);
    expect(body.applications[0].job.title).toBe("Frontend Engineer");
    expect(body.applications[0].application.status).toBe("REJECTED");
    expect(body.applications[1].job.title).toBe("Backend Engineer");
    expect(body.applications[1].application.status).toBe("APPLIED");
  });

  it("excludes another user's applications", async () => {
    handles = buildTestContainer();
    const job = buildJob();
    handles.jobRepository.seed(job);
    await handles.applicationRepository.save(
      Application.create({
        id: "a1",
        userId: "someone-else",
        jobId: job.id,
        appliedAt: new Date(),
      }),
    );

    const response = await GET(new NextRequest("http://localhost/api/applications?userId=u1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.applications).toEqual([]);
  });
});
