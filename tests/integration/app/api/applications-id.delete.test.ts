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

const { DELETE } = await import("@/app/api/applications/[id]/route");

function seedApplicationWithJob(target: TestContainerHandles) {
  const job = Job.create({
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
  });
  target.jobRepository.seed(job);

  const application = Application.create({
    id: "app1",
    userId: "u1",
    jobId: "j1",
    resumeId: "r1",
    appliedAt: new Date(),
  });
  return { job, application };
}

describe("DELETE /api/applications/:id", () => {
  it("removes the application", async () => {
    handles = buildTestContainer();
    const { application } = seedApplicationWithJob(handles);
    await handles.applicationRepository.save(application);

    const response = await DELETE(
      new NextRequest("http://localhost/api/applications/app1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "app1" }) },
    );

    expect(response.status).toBe(204);
    expect(await handles.applicationRepository.findById("app1")).toBeNull();
  });

  it("does not delete the underlying Job", async () => {
    handles = buildTestContainer();
    const { job, application } = seedApplicationWithJob(handles);
    await handles.applicationRepository.save(application);

    await DELETE(new NextRequest("http://localhost/api/applications/app1", { method: "DELETE" }), {
      params: Promise.resolve({ id: "app1" }),
    });

    expect(await handles.jobRepository.findById(job.id)).not.toBeNull();
  });

  it("returns 404 for an unknown application id", async () => {
    handles = buildTestContainer();

    const response = await DELETE(
      new NextRequest("http://localhost/api/applications/missing", { method: "DELETE" }),
      { params: Promise.resolve({ id: "missing" }) },
    );

    expect(response.status).toBe(404);
  });
});
