import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { Application } from "@/domain/entities/application";
import { buildTestContainer, TestContainerHandles } from "./support/build-test-container";

let handles: TestContainerHandles;

vi.mock("@/lib/di/get-container", () => ({
  getContainer: () => handles.container,
}));

const { PATCH } = await import("@/app/api/applications/[id]/status/route");

function jsonRequest(body: unknown) {
  return new NextRequest("http://localhost/api/applications/a1/status", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("PATCH /api/applications/:id/status", () => {
  it("transitions the application status", async () => {
    handles = buildTestContainer();
    await handles.applicationRepository.save(
      Application.create({ id: "a1", userId: "u1", jobId: "j1", appliedAt: new Date() }),
    );

    const response = await PATCH(jsonRequest({ status: "HR_SCREEN" }), {
      params: Promise.resolve({ id: "a1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.application.status).toBe("HR_SCREEN");
    expect(body.application.statusHistory).toHaveLength(2);
  });

  it("returns 404 when the application does not exist", async () => {
    handles = buildTestContainer();

    const response = await PATCH(jsonRequest({ status: "HR_SCREEN" }), {
      params: Promise.resolve({ id: "missing" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 409 for an illegal status transition", async () => {
    handles = buildTestContainer();
    await handles.applicationRepository.save(
      Application.create({
        id: "a1",
        userId: "u1",
        jobId: "j1",
        appliedAt: new Date(),
        status: "OFFER",
      }),
    );

    const response = await PATCH(jsonRequest({ status: "APPLIED" }), {
      params: Promise.resolve({ id: "a1" }),
    });

    expect(response.status).toBe(409);
  });

  it("returns 400 for an invalid status value", async () => {
    handles = buildTestContainer();
    await handles.applicationRepository.save(
      Application.create({ id: "a1", userId: "u1", jobId: "j1", appliedAt: new Date() }),
    );

    const response = await PATCH(jsonRequest({ status: "NOT_A_REAL_STATUS" }), {
      params: Promise.resolve({ id: "a1" }),
    });

    expect(response.status).toBe(400);
  });
});
