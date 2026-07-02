import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { Job } from "@/domain/entities/job";
import { Location } from "@/domain/value-objects/location";
import { buildTestContainer, TestContainerHandles } from "./support/build-test-container";

let handles: TestContainerHandles;

vi.mock("@/lib/di/get-container", () => ({
  getContainer: () => handles.container,
}));

const { DELETE, POST } = await import("@/app/api/jobs/[id]/save/route");

function seedJob(target: TestContainerHandles, id = "j1") {
  const job = Job.create({
    id,
    companyId: "c1",
    provider: "ADZUNA",
    externalId: id,
    title: "Staff Engineer",
    description: "desc",
    url: "https://example.com/jobs/1",
    location: Location.create({ country: "UK", isRemote: true }),
    firstSeenAt: new Date(),
    lastSeenAt: new Date(),
  });
  target.jobRepository.seed(job);
  return job;
}

function jsonRequest(url: string, method: string, body: unknown) {
  return new NextRequest(url, {
    method,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/jobs/:id/save", () => {
  it("saves a job for a user", async () => {
    handles = buildTestContainer();
    seedJob(handles);

    const response = await POST(
      jsonRequest("http://localhost/api/jobs/j1/save", "POST", { userId: "u1" }),
      {
        params: Promise.resolve({ id: "j1" }),
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.savedJob.status).toBe("SAVED");
    expect(body.savedJob.jobId).toBe("j1");
  });

  it("returns 404 when the job does not exist", async () => {
    handles = buildTestContainer();

    const response = await POST(
      jsonRequest("http://localhost/api/jobs/missing/save", "POST", { userId: "u1" }),
      { params: Promise.resolve({ id: "missing" }) },
    );

    expect(response.status).toBe(404);
  });

  it("returns 400 when userId is missing", async () => {
    handles = buildTestContainer();
    seedJob(handles);

    const response = await POST(jsonRequest("http://localhost/api/jobs/j1/save", "POST", {}), {
      params: Promise.resolve({ id: "j1" }),
    });

    expect(response.status).toBe(400);
  });
});

describe("DELETE /api/jobs/:id/save", () => {
  it("dismisses (un-saves) a previously saved job", async () => {
    handles = buildTestContainer();
    seedJob(handles);
    await handles.savedJobRepository.save({
      id: "sj1",
      userId: "u1",
      jobId: "j1",
      status: "SAVED",
      savedAt: new Date(),
    });

    const response = await DELETE(
      new NextRequest("http://localhost/api/jobs/j1/save?userId=u1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "j1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.savedJob.status).toBe("DISMISSED");
  });

  it("returns 404 when the job does not exist", async () => {
    handles = buildTestContainer();

    const response = await DELETE(
      new NextRequest("http://localhost/api/jobs/missing/save?userId=u1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "missing" }) },
    );

    expect(response.status).toBe(404);
  });

  it("returns 400 when the userId query param is missing", async () => {
    handles = buildTestContainer();
    seedJob(handles);

    const response = await DELETE(
      new NextRequest("http://localhost/api/jobs/j1/save", { method: "DELETE" }),
      { params: Promise.resolve({ id: "j1" }) },
    );

    expect(response.status).toBe(400);
  });
});
