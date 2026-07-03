import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { Profile } from "@/domain/entities/profile";
import { Resume } from "@/domain/entities/resume";
import { buildTestContainer, TestContainerHandles } from "./support/build-test-container";

let handles: TestContainerHandles;

vi.mock("@/lib/di/get-container", () => ({
  getContainer: () => handles.container,
}));

const { PATCH, DELETE } = await import("@/app/api/resumes/[id]/route");

function jsonRequest(url: string, method: string, body: unknown) {
  return new NextRequest(url, {
    method,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function seedProfileWithResumes(target: TestContainerHandles) {
  target.profileRepository.seed(Profile.create({ id: "p1", userId: "u1", updatedAt: new Date() }));
  target.resumeRepository.seed(
    Resume.create({
      id: "r1",
      profileId: "p1",
      label: "General",
      content: "Original content",
      parsedSkills: ["TypeScript"],
      isPrimary: true,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    }),
  );
}

describe("PATCH /api/resumes/:id (edit)", () => {
  it("updates label, content, and parsedSkills", async () => {
    handles = buildTestContainer();
    seedProfileWithResumes(handles);

    const response = await PATCH(
      jsonRequest("http://localhost/api/resumes/r1", "PATCH", {
        label: "Updated label",
        content: "Updated content",
        parsedSkills: ["Go", "Kubernetes"],
      }),
      { params: Promise.resolve({ id: "r1" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.resume.label).toBe("Updated label");
    expect(body.resume.content).toBe("Updated content");
    expect(body.resume.parsedSkills).toEqual(["Go", "Kubernetes"]);
    expect(body.resume.isPrimary).toBe(true);
  });

  it("allows a partial update, leaving unset fields unchanged", async () => {
    handles = buildTestContainer();
    seedProfileWithResumes(handles);

    const response = await PATCH(
      jsonRequest("http://localhost/api/resumes/r1", "PATCH", { label: "Only label changed" }),
      { params: Promise.resolve({ id: "r1" }) },
    );
    const body = await response.json();

    expect(body.resume.label).toBe("Only label changed");
    expect(body.resume.content).toBe("Original content");
  });

  it("does not accept isPrimary — primary status stays PATCH /api/resumes/:id/primary's job", async () => {
    handles = buildTestContainer();
    seedProfileWithResumes(handles);

    const response = await PATCH(
      jsonRequest("http://localhost/api/resumes/r1", "PATCH", { isPrimary: false }),
      { params: Promise.resolve({ id: "r1" }) },
    );
    const body = await response.json();

    // Unknown/rejected field is simply ignored by the schema; the resume's
    // actual isPrimary state is untouched.
    expect(response.status).toBe(200);
    expect(body.resume.isPrimary).toBe(true);
  });

  it("returns 404 for an unknown resume id", async () => {
    handles = buildTestContainer();

    const response = await PATCH(
      jsonRequest("http://localhost/api/resumes/missing", "PATCH", { label: "New" }),
      { params: Promise.resolve({ id: "missing" }) },
    );

    expect(response.status).toBe(404);
  });

  it("returns 400 for an empty label", async () => {
    handles = buildTestContainer();
    seedProfileWithResumes(handles);

    const response = await PATCH(
      jsonRequest("http://localhost/api/resumes/r1", "PATCH", { label: "  " }),
      { params: Promise.resolve({ id: "r1" }) },
    );

    expect(response.status).toBe(400);
  });
});

describe("DELETE /api/resumes/:id", () => {
  it("deletes a non-primary resume when others remain", async () => {
    handles = buildTestContainer();
    seedProfileWithResumes(handles);
    handles.resumeRepository.seed(
      Resume.create({
        id: "r2",
        profileId: "p1",
        label: "Draft",
        content: "content",
        isPrimary: false,
        createdAt: new Date(),
      }),
    );

    const response = await DELETE(
      new NextRequest("http://localhost/api/resumes/r2", { method: "DELETE" }),
      { params: Promise.resolve({ id: "r2" }) },
    );

    expect(response.status).toBe(204);
    expect(await handles.resumeRepository.findById("r2")).toBeNull();
  });

  it("returns 409 when deleting the profile's only resume", async () => {
    handles = buildTestContainer();
    seedProfileWithResumes(handles);

    const response = await DELETE(
      new NextRequest("http://localhost/api/resumes/r1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "r1" }) },
    );

    expect(response.status).toBe(409);
    expect(await handles.resumeRepository.findById("r1")).not.toBeNull();
  });

  it("reassigns primary to another resume when the primary is deleted", async () => {
    handles = buildTestContainer();
    seedProfileWithResumes(handles);
    handles.resumeRepository.seed(
      Resume.create({
        id: "r2",
        profileId: "p1",
        label: "Draft",
        content: "content",
        isPrimary: false,
        createdAt: new Date(),
      }),
    );

    const response = await DELETE(
      new NextRequest("http://localhost/api/resumes/r1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "r1" }) },
    );

    expect(response.status).toBe(204);
    expect((await handles.resumeRepository.findById("r2"))?.isPrimary).toBe(true);
  });

  it("returns 404 for an unknown resume id", async () => {
    handles = buildTestContainer();

    const response = await DELETE(
      new NextRequest("http://localhost/api/resumes/missing", { method: "DELETE" }),
      { params: Promise.resolve({ id: "missing" }) },
    );

    expect(response.status).toBe(404);
  });
});
