import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { Job } from "@/domain/entities/job";
import { Location } from "@/domain/value-objects/location";
import { buildTestContainer, TestContainerHandles } from "./support/build-test-container";

let handles: TestContainerHandles;

vi.mock("@/lib/di/get-container", () => ({
  getContainer: () => handles.container,
}));

const { GET } = await import("@/app/api/saved-jobs/route");

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

describe("GET /api/saved-jobs", () => {
  it("returns 400 when userId is missing", async () => {
    handles = buildTestContainer();

    const response = await GET(new NextRequest("http://localhost/api/saved-jobs"));

    expect(response.status).toBe(400);
  });

  it("returns an empty list when the user has no saved jobs", async () => {
    handles = buildTestContainer();

    const response = await GET(new NextRequest("http://localhost/api/saved-jobs?userId=u1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.savedJobs).toEqual([]);
  });

  it("returns saved jobs enriched with job details, most-recently-saved first", async () => {
    handles = buildTestContainer();
    const jobA = buildJob({ title: "Backend Engineer" });
    const jobB = buildJob({ title: "Frontend Engineer" });
    await handles.jobRepository.saveMany([jobA, jobB]);
    await handles.savedJobRepository.save({
      id: randomUUID(),
      userId: "u1",
      jobId: jobA.id,
      status: "SAVED",
      savedAt: new Date("2026-01-01T00:00:00Z"),
    });
    await handles.savedJobRepository.save({
      id: randomUUID(),
      userId: "u1",
      jobId: jobB.id,
      status: "SAVED",
      savedAt: new Date("2026-02-01T00:00:00Z"),
    });

    const response = await GET(new NextRequest("http://localhost/api/saved-jobs?userId=u1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.savedJobs).toHaveLength(2);
    expect(body.savedJobs[0].job.title).toBe("Frontend Engineer");
    expect(body.savedJobs[0].savedJob.userId).toBe("u1");
    expect(body.savedJobs[1].job.title).toBe("Backend Engineer");
  });

  it("excludes dismissed jobs and other users' saved jobs", async () => {
    handles = buildTestContainer();
    const jobA = buildJob({ title: "Dismissed role" });
    const jobB = buildJob({ title: "Someone else's saved role" });
    await handles.jobRepository.saveMany([jobA, jobB]);
    await handles.savedJobRepository.save({
      id: randomUUID(),
      userId: "u1",
      jobId: jobA.id,
      status: "DISMISSED",
      savedAt: new Date(),
    });
    await handles.savedJobRepository.save({
      id: randomUUID(),
      userId: "someone-else",
      jobId: jobB.id,
      status: "SAVED",
      savedAt: new Date(),
    });

    const response = await GET(new NextRequest("http://localhost/api/saved-jobs?userId=u1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.savedJobs).toEqual([]);
  });
});
