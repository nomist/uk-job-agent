import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { Profile } from "@/domain/entities/profile";
import { Resume } from "@/domain/entities/resume";
import { buildTestContainer, TestContainerHandles } from "./support/build-test-container";

let handles: TestContainerHandles;

vi.mock("@/lib/di/get-container", () => ({
  getContainer: () => handles.container,
}));

const { GET, POST } = await import("@/app/api/resumes/route");
const { PATCH } = await import("@/app/api/resumes/[id]/primary/route");

function jsonRequest(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("GET /api/resumes", () => {
  it("returns 400 when userId is missing", async () => {
    handles = buildTestContainer();

    const response = await GET(new NextRequest("http://localhost/api/resumes"));

    expect(response.status).toBe(400);
  });

  it("returns an empty list when the user has no resumes yet", async () => {
    handles = buildTestContainer();

    const response = await GET(new NextRequest("http://localhost/api/resumes?userId=u1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.resumes).toEqual([]);
  });

  it("returns the user's resumes", async () => {
    handles = buildTestContainer();
    handles.profileRepository.seed(
      Profile.create({ id: "p1", userId: "u1", updatedAt: new Date() }),
    );
    handles.resumeRepository.seed(
      Resume.create({
        id: "r1",
        profileId: "p1",
        label: "General",
        content: "content",
        createdAt: new Date(),
      }),
    );

    const response = await GET(new NextRequest("http://localhost/api/resumes?userId=u1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.resumes).toHaveLength(1);
    expect(body.resumes[0].label).toBe("General");
  });
});

describe("POST /api/resumes", () => {
  it("creates a resume, auto-creating a profile if none exists", async () => {
    handles = buildTestContainer();

    const response = await POST(
      jsonRequest("http://localhost/api/resumes", {
        userId: "u1",
        label: "General",
        content: "My resume content",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.resume.label).toBe("General");
    expect(body.resume.isPrimary).toBe(true);
    expect(await handles.profileRepository.findByUserId("u1")).not.toBeNull();
  });

  it("does not make a second resume primary by default", async () => {
    handles = buildTestContainer();
    await POST(
      jsonRequest("http://localhost/api/resumes", {
        userId: "u1",
        label: "First",
        content: "content",
      }),
    );

    const response = await POST(
      jsonRequest("http://localhost/api/resumes", {
        userId: "u1",
        label: "Second",
        content: "content 2",
      }),
    );
    const body = await response.json();

    expect(body.resume.isPrimary).toBe(false);
  });

  it("returns 400 when required fields are missing", async () => {
    handles = buildTestContainer();

    const response = await POST(jsonRequest("http://localhost/api/resumes", { userId: "u1" }));

    expect(response.status).toBe(400);
  });
});

describe("PATCH /api/resumes/:id/primary", () => {
  it("marks the resume primary and demotes the previous primary", async () => {
    handles = buildTestContainer();
    handles.profileRepository.seed(
      Profile.create({ id: "p1", userId: "u1", updatedAt: new Date() }),
    );
    handles.resumeRepository.seed(
      Resume.create({
        id: "r1",
        profileId: "p1",
        label: "General",
        content: "content",
        isPrimary: true,
        createdAt: new Date(),
      }),
    );
    handles.resumeRepository.seed(
      Resume.create({
        id: "r2",
        profileId: "p1",
        label: "Frontend",
        content: "content 2",
        isPrimary: false,
        createdAt: new Date(),
      }),
    );

    const response = await PATCH(
      new NextRequest("http://localhost/api/resumes/r2/primary", { method: "PATCH" }),
      {
        params: Promise.resolve({ id: "r2" }),
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.resume.isPrimary).toBe(true);
    const oldPrimary = await handles.resumeRepository.findById("r1");
    expect(oldPrimary?.isPrimary).toBe(false);
  });

  it("returns 404 for an unknown resume id", async () => {
    handles = buildTestContainer();

    const response = await PATCH(
      new NextRequest("http://localhost/api/resumes/missing/primary", { method: "PATCH" }),
      { params: Promise.resolve({ id: "missing" }) },
    );

    expect(response.status).toBe(404);
  });
});
