import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { Job } from "@/domain/entities/job";
import { Location } from "@/domain/value-objects/location";
import { buildTestContainer, TestContainerHandles } from "./support/build-test-container";

let handles: TestContainerHandles;

vi.mock("@/lib/di/get-container", () => ({
  getContainer: () => handles.container,
}));

const { GET } = await import("@/app/api/jobs/[id]/route");

describe("GET /api/jobs/:id", () => {
  it("returns the job when it exists", async () => {
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
        location: Location.create({ city: "London", country: "UK", isRemote: false }),
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      }),
    );

    const response = await GET(new NextRequest("http://localhost/api/jobs/j1"), {
      params: Promise.resolve({ id: "j1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.job.id).toBe("j1");
    expect(body.job.title).toBe("Staff Engineer");
  });

  it("returns 404 when the job does not exist", async () => {
    handles = buildTestContainer();

    const response = await GET(new NextRequest("http://localhost/api/jobs/missing"), {
      params: Promise.resolve({ id: "missing" }),
    });

    expect(response.status).toBe(404);
  });
});
