import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { Profile } from "@/domain/entities/profile";
import { buildTestContainer, TestContainerHandles } from "./support/build-test-container";

let handles: TestContainerHandles;

vi.mock("@/lib/di/get-container", () => ({
  getContainer: () => handles.container,
}));

const { GET, PUT } = await import("@/app/api/profile/route");

function jsonRequest(body: unknown) {
  return new NextRequest("http://localhost/api/profile", {
    method: "PUT",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("GET /api/profile", () => {
  it("returns 400 when userId is missing", async () => {
    handles = buildTestContainer();

    const response = await GET(new NextRequest("http://localhost/api/profile"));

    expect(response.status).toBe(400);
  });

  it("returns null when the user has no profile yet", async () => {
    handles = buildTestContainer();

    const response = await GET(new NextRequest("http://localhost/api/profile?userId=u1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile).toBeNull();
  });

  it("returns the user's profile when one exists", async () => {
    handles = buildTestContainer();
    handles.profileRepository.seed(
      Profile.create({ id: "p1", userId: "u1", headline: "Staff Engineer", updatedAt: new Date() }),
    );

    const response = await GET(new NextRequest("http://localhost/api/profile?userId=u1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile.headline).toBe("Staff Engineer");
  });
});

describe("PUT /api/profile", () => {
  it("creates a profile with the full field set", async () => {
    handles = buildTestContainer();

    const response = await PUT(
      jsonRequest({
        userId: "u1",
        headline: "Senior Engineer",
        yearsOfExperience: 5,
        skills: ["TypeScript", "React"],
        preferredLocations: ["London", "Remote"],
        workPreferences: ["REMOTE"],
        visaStatus: "NO_SPONSORSHIP_NEEDED",
        salaryExpectation: { min: 60000, max: 80000, currency: "GBP" },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile.headline).toBe("Senior Engineer");
    expect(body.profile.skills).toEqual(["TypeScript", "React"]);
    expect(body.profile.preferredLocations).toEqual(["London", "Remote"]);
    expect(body.profile.salaryExpectation.min).toBe(60000);
  });

  it("updates the existing profile in place on a second call", async () => {
    handles = buildTestContainer();

    const first = await PUT(jsonRequest({ userId: "u1", headline: "Junior" }));
    const firstBody = await first.json();
    const second = await PUT(jsonRequest({ userId: "u1", headline: "Senior" }));
    const secondBody = await second.json();

    expect(secondBody.profile.id).toBe(firstBody.profile.id);
    expect(secondBody.profile.headline).toBe("Senior");
  });

  it("returns 400 when userId is missing", async () => {
    handles = buildTestContainer();

    const response = await PUT(jsonRequest({ headline: "Senior" }));

    expect(response.status).toBe(400);
  });

  it("returns 400 for a negative years of experience", async () => {
    handles = buildTestContainer();

    const response = await PUT(jsonRequest({ userId: "u1", yearsOfExperience: -1 }));

    expect(response.status).toBe(400);
  });
});
