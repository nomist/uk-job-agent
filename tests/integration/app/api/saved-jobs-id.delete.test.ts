import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { buildTestContainer, TestContainerHandles } from "./support/build-test-container";

let handles: TestContainerHandles;

vi.mock("@/lib/di/get-container", () => ({
  getContainer: () => handles.container,
}));

const { DELETE } = await import("@/app/api/saved-jobs/[id]/route");

describe("DELETE /api/saved-jobs/:id", () => {
  it("permanently removes the saved-job record", async () => {
    handles = buildTestContainer();
    await handles.savedJobRepository.save({
      id: "sj1",
      userId: "u1",
      jobId: "j1",
      status: "SAVED",
      savedAt: new Date(),
    });

    const response = await DELETE(
      new NextRequest("http://localhost/api/saved-jobs/sj1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "sj1" }) },
    );

    expect(response.status).toBe(204);
    expect(await handles.savedJobRepository.findById("sj1")).toBeNull();
  });

  it("returns 404 for an unknown saved-job id", async () => {
    handles = buildTestContainer();

    const response = await DELETE(
      new NextRequest("http://localhost/api/saved-jobs/missing", { method: "DELETE" }),
      { params: Promise.resolve({ id: "missing" }) },
    );

    expect(response.status).toBe(404);
  });

  it("removing a saved job no longer excludes it from a future recommendation run (unlike Dismiss)", async () => {
    handles = buildTestContainer();
    await handles.savedJobRepository.save({
      id: "sj1",
      userId: "u1",
      jobId: "j1",
      status: "DISMISSED",
      savedAt: new Date(),
    });

    await DELETE(new NextRequest("http://localhost/api/saved-jobs/sj1", { method: "DELETE" }), {
      params: Promise.resolve({ id: "sj1" }),
    });

    expect(await handles.savedJobRepository.findByUserId("u1")).toEqual([]);
  });
});
